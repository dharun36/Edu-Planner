import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  learningPlansApi,
  LearningTask,
  LearningPlan,
  PracticeEvaluationResult,
} from '../../api/learningPlans';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Check,
  FileText,
  Lightbulb,
  Award,
  AlertCircle,
} from 'lucide-react';

export default function TaskWorkspace() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<LearningTask | null>(null);
  const [activePlan, setActivePlan] = useState<LearningPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Practice state
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<PracticeEvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      // Clear all state from previous task so nothing bleeds into the new task
      setTask(null);
      setPracticeAnswer('');
      setShowHint(false);
      setShowSolution(false);
      setPracticeSubmitted(false);
      setEvaluationResult(null);
      setCompleteError(null);
      loadTaskData(Number(taskId));
    }
  }, [taskId]);

  const loadTaskData = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const [taskData, planData] = await Promise.all([
        learningPlansApi.getTaskById(id),
        learningPlansApi.getActivePlan(),
      ]);
      setTask(taskData);
      setActivePlan(planData);
    } catch {
      setError('Unable to load task workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluatePractice = async () => {
    if (!task) return;
    if (!practiceAnswer.trim()) {
      setCompleteError('Please write your implementation or solution in the box above before submitting.');
      return;
    }
    setIsEvaluating(true);
    setCompleteError(null);
    try {
      const res = await learningPlansApi.evaluatePractice(task.id, practiceAnswer.trim());
      setEvaluationResult(res);
      setPracticeSubmitted(true);
      if (res.passed && res.score > 50) {
        setTask((prev) => (prev ? { ...prev, is_completed: true, latest_score: res.score } : null));
        // Refresh active plan so overall plan progress updates immediately
        const planData = await learningPlansApi.getActivePlan();
        setActivePlan(planData);
      } else {
        setTask((prev) => (prev ? { ...prev, is_completed: false, latest_score: res.score } : null));
        const planData = await learningPlansApi.getActivePlan();
        setActivePlan(planData);
      }
    } catch (err: any) {
      setCompleteError(err.response?.data?.detail || 'Failed to evaluate practice submission. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!task) return;
    const effectiveScore = evaluationResult?.score ?? task.latest_score ?? 0;
    const hasPassed = (evaluationResult?.passed && effectiveScore > 50) || (task.is_completed && effectiveScore > 50);

    if (!hasPassed) {
      setCompleteError('You must submit your practice solution and achieve a score greater than 50% to complete this task.');
      return;
    }
    setIsCompleting(true);
    setCompleteError(null);
    try {
      const updated = await learningPlansApi.completeTask(task.id);
      setTask(updated);
      const planData = await learningPlansApi.getActivePlan();
      setActivePlan(planData);
    } catch (err: any) {
      setCompleteError(err.response?.data?.detail || 'Failed to mark task complete.');
    } finally {
      setIsCompleting(false);
    }
  };

  const canMarkComplete = Boolean(
    (evaluationResult && evaluationResult.passed && evaluationResult.score > 50) ||
    (task && task.latest_score && task.latest_score > 50)
  );

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-xs text-[#737373]">
        Loading learning workspace...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm text-[#737373]">{error || 'Task not found.'}</p>
        <Button variant="secondary" onClick={() => navigate('/student/plan')}>
          Return to Learning Plan
        </Button>
      </div>
    );
  }

  // Derive next task in plan
  const allTasks: LearningTask[] = activePlan
    ? activePlan.modules.flatMap((m) => m.tasks || [])
    : [];
  const currentIndex = allTasks.findIndex((t) => t.id === task.id);
  const nextTask = currentIndex >= 0 && currentIndex < allTasks.length - 1 ? allTasks[currentIndex + 1] : null;

  const completedCount = allTasks.filter((t) => t.is_completed).length;
  const progressPercent = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;

  const defaultObjective =
    task.learning_objective ||
    `Understand the conceptual principles, structural invariants, and operational trade-offs of ${task.title}.`;

  const defaultContent =
    task.content ||
    `### Key Principles of ${task.title}

1. **Foundational Concept**: In modern computer science, understanding this mechanism allows you to build optimal systems and prevent algorithmic bottlenecks.
2. **Structural Invariants**:
   - Organized state hierarchy and invariant validation.
   - Guaranteed runtime bounds and memory locality.
   - Clean recursion termination or iterative pointer management.

\`\`\`python
# Example Implementation Reference
def solve_problem(root):
    if not root:
        return None
    # Process current node state
    left_result = solve_problem(root.left)
    right_result = solve_problem(root.right)
    return combine(left_result, right_result)
\`\`\`

3. **Common Pitfalls**:
   - Forgetting base case termination leading to stack overflow.
   - Modifying data structures in-place without preserving invariants.
   - Failing to account for boundary conditions (empty inputs, single-node states).`;

  const defaultPractice =
    task.practice_activity ||
    `Hands-on challenge for **${task.title}**:\n\n1. Write a minimal implementation directly demonstrating the core principles of ${task.title}.\n2. Test boundary conditions and edge cases (null inputs, empty states, boundary elements).\n3. Trace runtime executions and document memory invariants.`;

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-10">
      {/* 1. Back link */}
      <div>
        <Link
          to="/student/plan"
          className="inline-flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#0A0A0A] font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to learning plan
        </Link>
      </div>

      {/* 2. Workspace Title & Metadata */}
      <div className="space-y-2 border-b border-[#E5E5E5] pb-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            {task.task_type || 'Core Concept'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#737373] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.estimated_duration_minutes || 25} mins
            </span>
            {task.is_completed && <Badge variant="mastered">Completed</Badge>}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A]">
          {task.title}
        </h1>
        {task.description && (
          <p className="text-sm text-[#737373] leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* 3. Learning Objective (Section 17: Separators rather than nested cards) */}
      <section className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
          Learning objective
        </span>
        <p className="text-sm text-[#0A0A0A] leading-relaxed border-l-2 border-[#0A0A0A] pl-3 py-0.5">
          {defaultObjective}
        </p>
      </section>

      {/* 4. Lesson Content */}
      <section className="space-y-4 border-t border-[#E5E5E5] pt-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
          Lesson content
        </span>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 sm:p-8">
          <MarkdownRenderer content={defaultContent} />
        </div>
      </section>

      {/* 5. Practice Section */}
      <section className="space-y-4 border-t border-[#E5E5E5] pt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Practice Activity
          </span>
          <span className="text-xs text-[#737373]">Hands-on validation</span>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-4">
          <div className="text-sm text-[#0A0A0A] leading-relaxed">
            <MarkdownRenderer content={defaultPractice} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
              Your Implementation / Notes
            </label>
            <textarea
              rows={4}
              value={practiceAnswer}
              onChange={(e) => setPracticeAnswer(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] text-xs font-mono text-[#0A0A0A] focus-visible:outline-none focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]"
              placeholder="# Write code, invariants, or observations here..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E5E5]">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowHint(!showHint)}
              >
                <Lightbulb className="w-3.5 h-3.5 mr-1" />
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSolution(!showSolution)}
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                {showSolution ? 'Hide Solution' : 'Model Solution'}
              </Button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleEvaluatePractice}
              isLoading={isEvaluating}
            >
              Evaluate & Submit Practice
            </Button>
          </div>

          {showHint && (
            <div className="p-3 text-xs bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#262626] dark:text-[#E5E5E5]">
              <strong className="text-[#0A0A0A] dark:text-[#EDEDED]">Hint: </strong>
              {task.hint || 'Handle null checks and base cases first. Validate whether sub-problems strictly satisfy invariants before recursing.'}
            </div>
          )}

          {showSolution && (
            <div className="p-3 text-xs bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#262626] rounded-lg font-mono text-[#262626] dark:text-[#E5E5E5] whitespace-pre-wrap">
              {task.model_solution || '# Model solution will be provided after guided attempt.'}
            </div>
          )}

          {/* Evaluation Result Feedback Card */}
          {evaluationResult && (
            <div
              className={`p-4 sm:p-5 rounded-xl border space-y-3 transition-all ${
                evaluationResult.passed && evaluationResult.score > 50
                  ? 'bg-white dark:bg-[#171717] border-emerald-500/80 dark:border-emerald-500/60'
                  : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-500/60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant={evaluationResult.passed && evaluationResult.score > 50 ? 'mastered' : 'needs_attention'}>
                    Score: {evaluationResult.score}% • {evaluationResult.passed && evaluationResult.score > 50 ? 'PASSED' : 'NEEDS REVISION'}
                  </Badge>
                  <span
                    className={`text-xs font-semibold ${
                      evaluationResult.passed && evaluationResult.score > 50
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-800 dark:text-amber-400'
                    }`}
                  >
                    {evaluationResult.passed && evaluationResult.score > 50
                      ? 'Passing requirement met (> 50%)'
                      : 'Must score more than 50% to pass'}
                  </span>
                </div>
                {evaluationResult.passed && evaluationResult.score > 50 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
              </div>

              {evaluationResult.skill_update && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-[#E5E5E5] dark:border-[#262626] rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#0A0A0A] dark:text-[#FAFAFA]" />
                    <span>
                      Knowledge Domain:{' '}
                      <strong className="text-[#0A0A0A] dark:text-[#FAFAFA]">
                        {evaluationResult.skill_update.skill_category}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className={`font-semibold ${
                        evaluationResult.skill_update.delta >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {evaluationResult.skill_update.delta >= 0
                        ? `+${evaluationResult.skill_update.delta}%`
                        : `${evaluationResult.skill_update.delta}%`}
                    </span>
                    <span className="text-[#737373]">
                      ({Math.round(evaluationResult.skill_update.new_score)}% mastery)
                    </span>
                  </div>
                </div>
              )}

              <p className="text-xs sm:text-sm text-[#262626] dark:text-[#E5E5E5] leading-relaxed">
                {evaluationResult.feedback}
              </p>

              {evaluationResult.strengths && evaluationResult.strengths.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252] dark:text-[#A3A3A3]">
                    What Went Well
                  </span>
                  <ul className="space-y-1">
                    {evaluationResult.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[#262626] dark:text-[#E5E5E5]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluationResult.improvements && evaluationResult.improvements.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252] dark:text-[#A3A3A3]">
                    {evaluationResult.passed && evaluationResult.score > 50 ? 'Recommendations for Mastery' : 'Required Improvements'}
                  </span>
                  <ul className="space-y-1">
                    {evaluationResult.improvements.map((imp, idx) => (
                      <li
                        key={idx}
                        className={`flex items-start gap-2 text-xs ${
                          evaluationResult.passed && evaluationResult.score > 50
                            ? 'text-[#525252] dark:text-[#A3A3A3]'
                            : 'text-amber-900 dark:text-amber-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            evaluationResult.passed && evaluationResult.score > 50 ? 'bg-[#737373]' : 'bg-amber-600'
                          }`}
                        />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                className={`pt-2 border-t text-xs font-medium flex items-center justify-between ${
                  evaluationResult.passed && evaluationResult.score > 50
                    ? 'border-[#E5E5E5] dark:border-[#262626] text-emerald-700 dark:text-emerald-400'
                    : 'border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-400'
                }`}
              >
                <span>
                  {evaluationResult.passed && evaluationResult.score > 50
                    ? '✓ Solution verified! Task marked as completed.'
                    : 'Task remains in-progress. Revise your solution above and re-submit (must score > 50%).'}
                </span>
              </div>
            </div>
          )}

          {completeError && (
            <div className="p-3 text-xs bg-amber-50 border border-amber-300 dark:bg-amber-950/30 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{completeError}</span>
            </div>
          )}
        </div>
      </section>

      {/* 6. Task Progress & Completion Controls */}
      <section className="space-y-4 border-t border-[#E5E5E5] pt-6">
        <div className="flex items-center justify-between text-xs text-[#737373]">
          <span className="font-semibold uppercase tracking-wider text-[#525252]">
            Overall Plan Progress
          </span>
          <span>
            {completedCount} of {allTasks.length} tasks completed ({progressPercent}%)
          </span>
        </div>
        <ProgressBar value={progressPercent} size="md" variant="dark" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {task.is_completed ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                Task marked as completed{task.latest_score ? ` (Score: ${task.latest_score}%)` : ''}.
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-1">
              <Button
                variant="primary"
                size="md"
                onClick={handleCompleteTask}
                isLoading={isCompleting}
                disabled={!canMarkComplete}
              >
                <Check className="w-4 h-4 mr-1.5" />
                Mark Task as Complete
              </Button>
              {!canMarkComplete && (
                <span className="text-[11px] text-[#737373]">
                  Requires &gt; 50% score on the practice activity above.
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {nextTask ? (
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate(`/student/learn/${nextTask.id}`)}
              >
                Next Task: {nextTask.title}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : activePlan ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/student/verify/${activePlan.id}`)}
              >
                <Award className="w-4 h-4 mr-1.5" />
                Take Verification Test
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
