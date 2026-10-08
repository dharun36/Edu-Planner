import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { learningPlansApi, LearningTask, LearningPlan } from '../../api/learningPlans';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  BookOpen,
  CheckCircle2,
  Code,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Clock,
  Layers,
  HelpCircle,
  AlertCircle,
  Loader2,
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

  // Practice activity state
  const [userPracticeAnswer, setUserPracticeAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [practiceChecked, setPracticeChecked] = useState(false);

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
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load task learning workspace.');
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
    } catch (err: any) {
      alert('Failed to mark task complete.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-gray-400 text-sm">Preparing your interactive learning workspace...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error || 'Task not found.'}</span>
        </div>
        <Button variant="outline" onClick={() => navigate('/student/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  // Find next task in active plan if available
  const allTasks: LearningTask[] = activePlan
    ? activePlan.modules.flatMap((m) => m.tasks)
    : [];
  const currentIndex = allTasks.findIndex((t) => t.id === task.id);
  const nextTask = currentIndex >= 0 && currentIndex < allTasks.length - 1 ? allTasks[currentIndex + 1] : null;

  // Fallback enriched explanation if none in DB
  const defaultObjective =
    task.learning_objective ||
    `Understand the foundational theory and practical implementation of ${task.title}, identifying edge cases and complexity characteristics.`;

  const defaultContent =
    task.content ||
    `### Key Principles of ${task.title}

1. **Foundational Concept**: In modern computer science, understanding this mechanism allows you to build optimal systems and prevent algorithmic bottlenecks.
2. **Structural Characteristics**:
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/student/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Learning Plan
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 capitalize">
            {task.task_type}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.estimated_duration_minutes || 25} mins
          </span>
          {task.is_completed && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-500/20 border border-neutral-500/30 text-neutral-300 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Task Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-surface to-surface-light border border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-xs text-primary font-semibold uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          <span>Interactive Learning Workspace</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {task.title}
        </h1>
        {task.description && (
          <p className="text-gray-300 text-sm">{task.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Learning Objective Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Learning Objective
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-200 text-sm leading-relaxed">{defaultObjective}</p>
            </CardContent>
          </Card>

          {/* Lesson & Explanation Card */}
          <Card className="border-white/10 bg-surface/90">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <BookOpen className="w-5 h-5 text-neutral-400" />
                Lesson Content & Conceptual Walkthrough
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none text-sm text-gray-300 space-y-4 leading-relaxed">
              <div className="whitespace-pre-line font-sans text-gray-300 leading-relaxed bg-black/20 p-5 rounded-xl border border-white/5">
                {defaultContent}
              </div>
            </CardContent>
          </Card>

          {/* Practice Activity Card */}
          <Card className="border-neutral-500/20 bg-surface/90">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <Code className="w-5 h-5 text-neutral-400" />
                Hands-On Practice Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-200 text-sm">
                <p className="font-semibold mb-1">Challenge Prompt:</p>
                <p>{defaultPractice}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Your Implementation / Notes:
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white font-mono text-xs placeholder-gray-500 focus:outline-none focus:border-neutral-500"
                  placeholder="# Write your solution, test cases, or analysis here..."
                  value={userPracticeAnswer}
                  onChange={(e) => setUserPracticeAnswer(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs gap-1.5"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-neutral-400" />
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSolution(!showSolution)}
                  className="text-xs gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  {showSolution ? 'Hide Solution' : 'View Model Solution'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPracticeChecked(true)}
                  className="text-xs bg-neutral-600 hover:bg-neutral-500 text-white gap-1.5 ml-auto"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Test Solution
                </Button>
              </div>

              {showHint && (
                <div className="p-3 rounded-lg bg-neutral-500/10 border border-neutral-500/20 text-neutral-300 text-xs">
                  💡 <strong>Hint:</strong> Remember to always handle null/empty checks first. Check if the left child is strictly smaller and the right child strictly larger before continuing recursions.
                </div>
              )}

              {showSolution && (
                <div className="p-4 rounded-lg bg-neutral-500/10 border border-neutral-500/20 text-gray-300 text-xs font-mono whitespace-pre-wrap">
                  {`# Model Solution
def is_valid_bst(node, min_val=float('-inf'), max_val=float('inf')):
    if not node:
        return True
    if not (min_val < node.val < max_val):
        return False
    return (is_valid_bst(node.left, min_val, node.val) and 
            is_valid_bst(node.right, node.val, max_val))`}
                </div>
              )}

              {practiceChecked && (
                <div className="p-3 rounded-lg bg-neutral-500/20 border border-neutral-500/30 text-neutral-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>Great job testing your understanding! Ready to complete this task.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions & Progress */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card className="border-white/10 bg-surface/90 sticky top-6">
            <CardHeader>
              <CardTitle className="text-base text-white">Task Completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-400 leading-relaxed">
                Once you have studied the lesson and completed the practice challenge, mark this task complete to advance your plan.
              </p>

              {task.is_completed ? (
                <div className="p-4 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-neutral-400 mx-auto" />
                  <p className="text-sm font-bold text-neutral-300">Task Completed!</p>
                  <p className="text-xs text-gray-400">
                    Evidence recorded in your learning profile.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleCompleteTask}
                  isLoading={isCompleting}
                  className="w-full py-3 font-semibold gap-2 shadow-lg shadow-primary/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Task as Complete
                </Button>
              )}

              {nextTask && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/student/learn/${nextTask.id}`)}
                  className="w-full text-xs gap-2"
                >
                  Next: {nextTask.title}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {activePlan && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/student/verify/${activePlan.id}`)}
                    className="w-full text-xs text-primary hover:text-primary-light gap-2"
                  >
                    <Award className="w-4 h-4 text-neutral-300" />
                    Take Verification Test
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/student/dashboard')}
                    className="w-full text-xs text-gray-400 hover:text-white"
                  >
                    Return to Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
