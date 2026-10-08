import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { aiApi } from '../../api/ai';
import {
  learningPlansApi,
  LearningPlan,
  LearningModule,
  LearningTask,
} from '../../api/learningPlans';
import { LearningPlanRequest, LearningPlanResponse } from '../../types/learningPlan';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen,
  ChevronRight,
  Plus,
  RotateCcw,
  Layers,
  Award,
} from 'lucide-react';

export default function LearningPlanGenerator() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activePlan, setActivePlan] = useState<LearningPlan | null>(null);
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form states
  const [formData, setFormData] = useState<LearningPlanRequest>({
    subject: user?.learning_subject || 'Data Structures',
    topic: user?.learning_topic || 'Binary Search Trees',
    learning_goal:
      user?.learning_goal || 'I want to understand and implement Binary Search Trees.',
    college: user?.college || '',
    semester: user?.semester || '',
    regulation: user?.regulation || '',
    year: user?.year_of_study || '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadActivePlan();
  }, []);

  const loadActivePlan = async () => {
    setIsLoading(true);
    try {
      const plan = await learningPlansApi.getActivePlan();
      setActivePlan(plan);
      if (plan && plan.modules && plan.modules.length > 0) {
        setSelectedModule(plan.modules[0]);
      }
    } catch {
      // Intentionally quiet
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError('');

    try {
      await aiApi.generateLearningPlan(formData);
      // Reload active plan from database
      await loadActivePlan();
      setShowCreateForm(false);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Failed to generate learning plan. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Derive module status
  const getModuleStatus = (module: LearningModule) => {
    const tasks = module.tasks || [];
    if (tasks.length === 0) return { label: 'Upcoming', badge: 'neutral' as const };
    const completed = tasks.filter((t) => t.is_completed).length;
    if (completed === tasks.length) return { label: 'Completed', badge: 'mastered' as const };
    if (completed > 0) return { label: 'In Progress', badge: 'developing' as const };
    return { label: 'Upcoming', badge: 'needs_attention' as const };
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Personalized Path
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A] mt-1">
            {activePlan?.topic || formData.topic}
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            {activePlan?.learning_goal || formData.learning_goal}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activePlan && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/student/verify/${activePlan.id}`)}
            >
              <Award className="w-3.5 h-3.5 mr-1.5" />
              Verify Plan
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Back to Plan' : 'Generate Next Plan'}
          </Button>
        </div>
      </div>

      {/* CREATE NEW ADAPTIVE PLAN FORM (Collapsible) */}
      {showCreateForm ? (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">
              Generate Adaptive Learning Plan
            </h2>
            <p className="text-xs text-[#737373]">
              EduPlanner analyzes your persistent learner model, verifies prerequisites, and synthesizes a structured sequence of tasks.
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs bg-white border border-[#262626] text-[#0A0A0A] rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                Subject Domain
              </label>
              <Input
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g. Data Structures"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                Target Topic
              </label>
              <Input
                required
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g. Binary Search Trees"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                Learning Goal
              </label>
              <textarea
                required
                rows={3}
                value={formData.learning_goal}
                onChange={(e) => setFormData({ ...formData, learning_goal: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#0A0A0A] focus-visible:outline-none focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A] leading-relaxed"
                placeholder="e.g. I want to understand and implement Binary Search Trees."
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isGenerating}
              >
                Synthesize Plan
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </form>
        </div>
      ) : activePlan && activePlan.modules && activePlan.modules.length > 0 ? (
        /* SECTION 15 & 16: Vertical Journey + Focused Module Detail */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Vertical Journey Column (Left 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
              Your personalized path
            </span>

            <div className="relative space-y-0">
              {activePlan.modules.map((module, idx) => {
                const stepNum = String(idx + 1).padStart(2, '0');
                const statusInfo = getModuleStatus(module);
                const isSelected = selectedModule?.id === module.id;
                const isLast = idx === activePlan.modules.length - 1;
                const completedTasks = (module.tasks || []).filter((t) => t.is_completed).length;
                const totalTasks = (module.tasks || []).length;

                return (
                  <div key={module.id} className="relative">
                    {/* Vertical connecting line */}
                    {!isLast && (
                      <div className="absolute left-6 top-14 bottom-0 w-px bg-[#E5E5E5] z-0" />
                    )}

                    <div
                      onClick={() => setSelectedModule(module)}
                      className={`relative z-10 flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer mb-3 ${
                        isSelected
                          ? 'border-[#0A0A0A] bg-white shadow-sm'
                          : 'border-[#E5E5E5] bg-white hover:border-[#A3A3A3]'
                      }`}
                    >
                      {/* Step Indicator */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono text-xs font-semibold shrink-0 transition-colors ${
                          statusInfo.label === 'Completed'
                            ? 'bg-[#0A0A0A] text-white'
                            : isSelected
                            ? 'bg-[#F5F5F5] border border-[#0A0A0A] text-[#0A0A0A]'
                            : 'bg-[#F5F5F5] text-[#525252] border border-[#E5E5E5]'
                        }`}
                      >
                        {statusInfo.label === 'Completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                          stepNum
                        )}
                      </div>

                      {/* Module Overview */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-sm text-[#0A0A0A] truncate">
                            {module.title}
                          </h3>
                          <Badge variant={statusInfo.badge}>{statusInfo.label}</Badge>
                        </div>

                        <p className="text-xs text-[#737373] line-clamp-2 leading-relaxed">
                          {module.description || 'Focus on theory, implementation invariants, and algorithmic verification.'}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-[#737373] pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ~25 mins
                          </span>
                          <span>
                            {completedTasks} / {totalTasks} tasks completed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Module Detail Column (Right 5 cols - Section 16) */}
          <div className="lg:col-span-5">
            {selectedModule ? (
              <div className="sticky top-20 bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#737373]">
                    <span>Module {selectedModule.order_index} of {activePlan.modules.length}</span>
                    <Badge variant={getModuleStatus(selectedModule).badge}>
                      {getModuleStatus(selectedModule).label}
                    </Badge>
                  </div>
                  <h2 className="text-lg font-semibold text-[#0A0A0A] mt-1">
                    {selectedModule.title}
                  </h2>
                </div>

                {/* Learning Objective */}
                <div className="border-t border-[#E5E5E5] pt-4 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
                    Learning objective
                  </span>
                  <p className="text-xs text-[#262626] leading-relaxed">
                    {selectedModule.description ||
                      'Understand fundamental node terminology, structural invariants, and operational runtimes.'}
                  </p>
                </div>

                {/* Tasks List */}
                <div className="border-t border-[#E5E5E5] pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
                      Module Tasks & Practice
                    </span>
                    <span className="text-[11px] text-[#737373]">
                      {(selectedModule.tasks || []).filter((t) => t.is_completed).length} /{' '}
                      {(selectedModule.tasks || []).length} completed
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(selectedModule.tasks || []).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => navigate(`/student/learn/${task.id}`)}
                        className="p-3 rounded-lg border border-[#E5E5E5] hover:border-[#0A0A0A] bg-white transition-all flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {task.is_completed ? (
                            <div className="w-4 h-4 rounded-full bg-[#0A0A0A] flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-[#A3A3A3] shrink-0" />
                          )}
                          <span className={`text-xs font-medium truncate ${task.is_completed ? 'line-through text-[#737373]' : 'text-[#0A0A0A]'}`}>
                            {task.title}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#737373] group-hover:text-[#0A0A0A] group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Action */}
                <div className="border-t border-[#E5E5E5] pt-4">
                  {selectedModule.tasks && selectedModule.tasks.length > 0 && (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        const firstUnfinished =
                          selectedModule.tasks.find((t) => !t.is_completed) ||
                          selectedModule.tasks[0];
                        navigate(`/student/learn/${firstUnfinished.id}`);
                      }}
                    >
                      Continue Module
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 border border-dashed border-[#E5E5E5] rounded-xl text-center text-xs text-[#737373]">
                Select a module from your path to inspect objectives and tasks.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-white border border-dashed border-[#E5E5E5] rounded-xl space-y-3">
          <p className="text-sm font-semibold text-[#0A0A0A]">
            No personalized learning plan generated yet.
          </p>
          <p className="text-xs text-[#737373] max-w-sm mx-auto">
            Set your target topic or take the baseline assessment to generate your personalized learning path.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowCreateForm(true)}
            >
              Generate First Plan
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
