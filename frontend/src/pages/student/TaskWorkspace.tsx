import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { learningPlansApi, LearningTask, LearningPlan } from '../../api/learningPlans';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Check,
  FileText,
  Lightbulb,
  Award,
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

  useEffect(() => {
    if (taskId) {
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

  const handleCompleteTask = async () => {
    if (!task) return;
    setIsCompleting(true);
    try {
      const updated = await learningPlansApi.completeTask(task.id);
      setTask((prev) => (prev ? { ...prev, is_completed: true } : updated));
    } catch {
      alert('Failed to mark task complete.');
    } finally {
      setIsCompleting(false);
    }
  };

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
    `Write a function that accepts an input representing this structure, checks whether the required invariants hold true, and prints the traversal order. Trace the call stack on paper for 3 nodes.`;

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
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 sm:p-8 space-y-4 text-sm text-[#262626] leading-relaxed font-sans">
          <div className="whitespace-pre-line leading-relaxed font-sans text-[14px]">
            {defaultContent}
          </div>
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
          <div className="text-sm text-[#0A0A0A] font-medium leading-relaxed">
            {defaultPractice}
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
              onClick={() => setPracticeSubmitted(true)}
            >
              Submit Practice
            </Button>
          </div>

          {showHint && (
            <div className="p-3 text-xs bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg text-[#262626]">
              <strong>Hint:</strong> Handle null checks and empty nodes first. Validate whether left subtrees strictly satisfy invariant boundaries before recursing right.
            </div>
          )}

          {showSolution && (
            <div className="p-3 text-xs bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg font-mono text-[#262626] whitespace-pre-wrap">
              {`def is_valid_bst(node, min_val=float('-inf'), max_val=float('inf')):
    if not node:
        return True
    if not (min_val < node.val < max_val):
        return False
    return is_valid_bst(node.left, min_val, node.val) and is_valid_bst(node.right, node.val, max_val)`}
            </div>
          )}

          {practiceSubmitted && (
            <div className="p-3 text-xs bg-[#F5F5F5] border border-[#0A0A0A] rounded-lg text-[#0A0A0A] flex items-center gap-2">
              <Check className="w-4 h-4 text-[#0A0A0A] shrink-0" />
              <span>Practice submitted. You can now mark this task as complete.</span>
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
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0A0A]">
              <CheckCircle2 className="w-4 h-4 text-[#0A0A0A]" />
              <span>Task marked as completed.</span>
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleCompleteTask}
              isLoading={isCompleting}
            >
              <Check className="w-4 h-4 mr-1.5" />
              Mark Task as Complete
            </Button>
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
