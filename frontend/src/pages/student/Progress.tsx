import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { progressApi, StudentProgressSummary, MilestoneItem } from '../../api/progress';
import { skillsApi, SkillScore } from '../../api/skills';
import {
  learningPlansApi,
  LearningPlan,
  LearningModule,
  LearningTask,
} from '../../api/learningPlans';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Check,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  BookOpen,
  Layers,
  Award,
  Clock,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  Flame,
  Filter,
} from 'lucide-react';

export default function Progress() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<StudentProgressSummary | null>(null);
  const [skills, setSkills] = useState<SkillScore[]>([]);
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [activePlan, setActivePlan] = useState<LearningPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [planFilter, setPlanFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [skillFilter, setSkillFilter] = useState<'all' | 'mastered' | 'developing'>('all');

  useEffect(() => {
    loadAllProgressData();
  }, []);

  const loadAllProgressData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, skillRes, plansRes, activeRes] = await Promise.allSettled([
        progressApi.getSummary(),
        skillsApi.getRawSkills(),
        learningPlansApi.getAllPlans(),
        learningPlansApi.getActivePlan(),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (skillRes.status === 'fulfilled') setSkills(skillRes.value || []);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value || []);
      if (activeRes.status === 'fulfilled') setActivePlan(activeRes.value);
    } catch {
      // Intentionally quiet
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to compute stats for a single plan
  const getPlanMetrics = (plan: LearningPlan) => {
    let totalTasks = 0;
    let completedTasks = 0;
    let firstIncompleteTask: LearningTask | null = null;

    for (const m of plan.modules || []) {
      for (const t of m.tasks || []) {
        totalTasks++;
        if (t.is_completed) {
          completedTasks++;
        } else if (!firstIncompleteTask) {
          firstIncompleteTask = t;
        }
      }
    }

    const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const isCompleted = plan.status === 'completed' || (totalTasks > 0 && completedTasks === totalTasks);
    const isActive = activePlan?.id === plan.id || plan.status === 'active';

    return {
      totalTasks,
      completedTasks,
      percent,
      isCompleted,
      isActive,
      firstIncompleteTask,
    };
  };

  // Aggregated totals across ALL plans
  const totalAggTasks = plans.reduce((acc, p) => {
    const metrics = getPlanMetrics(p);
    return acc + metrics.totalTasks;
  }, 0);

  const totalAggCompleted = plans.reduce((acc, p) => {
    const metrics = getPlanMetrics(p);
    return acc + metrics.completedTasks;
  }, 0);

  const totalCompletedPlans = plans.filter((p) => {
    const metrics = getPlanMetrics(p);
    return metrics.isCompleted;
  }).length;

  const totalInProgressPlans = plans.filter((p) => {
    const metrics = getPlanMetrics(p);
    return !metrics.isCompleted;
  }).length;

  const overallTasksPercent =
    totalAggTasks > 0 ? Math.round((totalAggCompleted / totalAggTasks) * 100) : 0;

  // Real average skill score
  const avgSkillScore =
    skills.length > 0
      ? Math.round(skills.reduce((acc, s) => acc + s.score, 0) / skills.length)
      : summary?.average_skill_score ?? 0;

  const masteredSkillsCount = skills.filter((s) => s.score >= 80).length;

  // Filtered plans
  const filteredPlans = plans.filter((p) => {
    const metrics = getPlanMetrics(p);
    if (planFilter === 'in_progress') return !metrics.isCompleted;
    if (planFilter === 'completed') return metrics.isCompleted;
    return true;
  });

  // Filtered skills
  const filteredSkills = skills.filter((s) => {
    if (skillFilter === 'mastered') return s.score >= 80;
    if (skillFilter === 'developing') return s.score < 80;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-10">
      {/* Page Header */}
      <div className="space-y-1 border-b border-[#E5E5E5] pb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#525252]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Comprehensive Learning Record
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A] mt-1">
          Learning Progress & Skill Evolution
        </h1>
        <p className="text-sm text-[#737373]">
          Track all your customized learning plans, completed task milestones, and verified skill competency.
        </p>
      </div>

      {/* 1. KEY METRICS OVERVIEW (4-Card Grid) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Mastery */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#737373] uppercase font-semibold">Skill Mastery</span>
            <Award className="w-4 h-4 text-[#737373]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-[#0A0A0A]">
              {avgSkillScore}%
            </span>
            <span className="text-xs text-[#737373]">avg</span>
          </div>
          <div className="w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0A0A0A] rounded-full transition-all duration-300"
              style={{ width: `${Math.max(4, avgSkillScore)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#737373]">
            {masteredSkillsCount} of {skills.length} skills mastered (≥80%)
          </p>
        </div>

        {/* Metric 2: All Learning Plans */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#737373] uppercase font-semibold">Total Plans</span>
            <Layers className="w-4 h-4 text-[#737373]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-[#0A0A0A]">
              {plans.length}
            </span>
            <span className="text-xs text-[#737373]">created</span>
          </div>
          <div className="text-[11px] text-[#737373] pt-2 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#0A0A0A]" />
            <span>{totalInProgressPlans} in progress</span>
            <span className="text-[#D4D4D4]">•</span>
            <span>{totalCompletedPlans} completed</span>
          </div>
        </div>

        {/* Metric 3: Total Tasks Across All Plans */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#737373] uppercase font-semibold">Tasks Completed</span>
            <CheckCircle2 className="w-4 h-4 text-[#737373]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-[#0A0A0A]">
              {totalAggCompleted}
            </span>
            <span className="text-xs text-[#737373]">/ {totalAggTasks} total</span>
          </div>
          <div className="w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#525252] rounded-full transition-all duration-300"
              style={{ width: `${Math.max(2, overallTasksPercent)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#737373]">
            {overallTasksPercent}% completion rate across all plans
          </p>
        </div>

        {/* Metric 4: Streak Days */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#737373] uppercase font-semibold">Learning Streak</span>
            <Flame className="w-4 h-4 text-[#737373]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-[#0A0A0A]">
              {summary?.streak_days || 1}
            </span>
            <span className="text-xs text-[#737373]">days active</span>
          </div>
          <p className="text-[11px] text-[#737373] pt-4">
            Practice daily to retain algorithmic mastery.
          </p>
        </div>
      </section>

      {/* 2. SECTION: ALL LEARNING PLANS & PROGRESS (Main Feature requested by user) */}
      <section className="space-y-4 pt-4 border-t border-[#E5E5E5]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
              Learning Plans & Paths
            </span>
            <h2 className="text-lg font-semibold text-[#0A0A0A] mt-0.5">
              All Generated Plans ({plans.length})
            </h2>
            <p className="text-xs text-[#737373]">
              Review the detailed progress of each plan you've created. Click any path to continue or resume study.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#F5F5F5] p-1 rounded-lg border border-[#E5E5E5] shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setPlanFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                planFilter === 'all'
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-[#737373] hover:text-[#0A0A0A]'
              }`}
            >
              All ({plans.length})
            </button>
            <button
              onClick={() => setPlanFilter('in_progress')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                planFilter === 'in_progress'
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-[#737373] hover:text-[#0A0A0A]'
              }`}
            >
              In Progress ({totalInProgressPlans})
            </button>
            <button
              onClick={() => setPlanFilter('completed')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                planFilter === 'completed'
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-[#737373] hover:text-[#0A0A0A]'
              }`}
            >
              Completed ({totalCompletedPlans})
            </button>
          </div>
        </div>

        {/* Plans List */}
        {filteredPlans.length === 0 ? (
          <div className="py-12 text-center bg-white border border-dashed border-[#E5E5E5] rounded-xl space-y-3">
            <BookOpen className="w-8 h-8 mx-auto text-[#A3A3A3]" />
            <p className="text-sm font-semibold text-[#0A0A0A]">
              {plans.length === 0 ? 'No learning plans generated yet' : 'No plans match this filter'}
            </p>
            <p className="text-xs text-[#737373] max-w-sm mx-auto">
              Generate a personalized learning path to start tracking your curriculum progress.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/student/plan')}
            >
              Generate New Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlans.map((plan) => {
              const metrics = getPlanMetrics(plan);

              return (
                <div
                  key={plan.id}
                  className="bg-white border border-[#E5E5E5] hover:border-[#A3A3A3] rounded-xl p-5 sm:p-6 transition-all space-y-4 shadow-sm"
                >
                  {/* Plan Top Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                          {plan.subject}
                        </span>
                        <span className="text-[#D4D4D4]">•</span>
                        <h3 className="text-base font-semibold text-[#0A0A0A]">
                          {plan.topic}
                        </h3>
                        {metrics.isCompleted ? (
                          <Badge variant="mastered">Completed</Badge>
                        ) : (
                          <Badge variant="neutral">In Progress</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#737373] line-clamp-2 max-w-2xl">
                        {plan.learning_goal || `Comprehensive path covering ${plan.topic}.`}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      {metrics.firstIncompleteTask ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/student/learn/${metrics.firstIncompleteTask?.id}`)}
                        >
                          <Play className="w-3 h-3 mr-1.5" />
                          Continue Task
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/student/verify/${plan.id}`)}
                        >
                          <Award className="w-3.5 h-3.5 mr-1.5" />
                          Verify Mastery
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/student/plan?planId=${plan.id}`)}
                      >
                        View Path
                        <ChevronRight className="w-3.5 h-3.5 ml-1 text-[#737373]" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar & Task Count */}
                  <div className="space-y-1.5 pt-2 border-t border-[#F5F5F5]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#525252] font-medium">Path Completion</span>
                      <span className="font-semibold text-[#0A0A0A]">
                        {metrics.completedTasks} of {metrics.totalTasks} tasks completed ({metrics.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E5E5] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          metrics.percent === 100
                            ? 'bg-[#0A0A0A]'
                            : metrics.percent > 0
                            ? 'bg-[#525252]'
                            : 'bg-[#D4D4D4]'
                        }`}
                        style={{ width: `${Math.max(metrics.percent > 0 ? 3 : 0, metrics.percent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. SECTION: SKILLS LEARNED & COMPETENCIES */}
      <section className="space-y-4 pt-4 border-t border-[#E5E5E5]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
              Learner Model
            </span>
            <h2 className="text-lg font-semibold text-[#0A0A0A] mt-0.5">
              Skills Acquired & Verified ({skills.length})
            </h2>
            <p className="text-xs text-[#737373]">
              Evaluated through diagnostic assessments, task practice submissions, and path verifications.
            </p>
          </div>

          {/* Skill Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#F5F5F5] p-1 rounded-lg border border-[#E5E5E5] shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setSkillFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                skillFilter === 'all'
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-[#737373] hover:text-[#0A0A0A]'
              }`}
            >
              All Skills ({skills.length})
            </button>
            <button
              onClick={() => setSkillFilter('mastered')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                skillFilter === 'mastered'
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-[#737373] hover:text-[#0A0A0A]'
              }`}
            >
              Mastered ({masteredSkillsCount})
            </button>
            <button
              onClick={() => setSkillFilter('developing')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                skillFilter === 'developing'
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-[#737373] hover:text-[#0A0A0A]'
              }`}
            >
              Developing ({skills.length - masteredSkillsCount})
            </button>
          </div>
        </div>

        {/* Skills Cards Grid */}
        {filteredSkills.length === 0 ? (
          <div className="py-8 text-center bg-white border border-dashed border-[#E5E5E5] rounded-xl space-y-2">
            <p className="text-xs text-[#737373]">
              No skills match the selected filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredSkills.map((sk) => {
              const scorePct = Math.round(sk.score);
              const isMastered = scorePct >= 80;
              const isProficient = scorePct >= 60 && scorePct < 80;
              const isDeveloping = scorePct >= 40 && scorePct < 60;

              return (
                <div
                  key={sk.id || sk.skill_category}
                  className="bg-white border border-[#E5E5E5] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-[#0A0A0A] truncate">
                      {sk.skill_category}
                    </span>
                    {isMastered ? (
                      <Badge variant="mastered">Mastered</Badge>
                    ) : isProficient ? (
                      <Badge variant="developing">Proficient</Badge>
                    ) : isDeveloping ? (
                      <Badge variant="developing">Developing</Badge>
                    ) : (
                      <Badge variant="needs_attention">Foundational</Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#737373]">Competence Score</span>
                      <span className="font-mono font-semibold text-[#0A0A0A]">
                        {scorePct}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          scorePct >= 80
                            ? 'bg-[#0A0A0A]'
                            : scorePct >= 50
                            ? 'bg-[#525252]'
                            : 'bg-[#A3A3A3]'
                        }`}
                        style={{ width: `${Math.max(4, scorePct)}%` }}
                      />
                    </div>
                  </div>

                  {sk.last_updated && (
                    <div className="flex items-center justify-between text-[11px] text-[#A3A3A3] pt-1">
                      <span>Last updated</span>
                      <span>{new Date(sk.last_updated).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. SECTION: MILESTONES & HISTORY */}
      {summary?.recent_milestones && summary.recent_milestones.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-[#E5E5E5]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Recent Milestones
          </span>

          <div className="bg-white border border-[#E5E5E5] rounded-xl divide-y divide-[#E5E5E5]">
            {summary.recent_milestones.slice(0, 6).map((m: MilestoneItem) => (
              <div key={m.id} className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#0A0A0A]">
                      {m.title}
                    </span>
                    <Badge variant="neutral">{m.type.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-[#737373]">
                    {m.description}
                  </p>
                </div>
                <span className="text-[11px] text-[#A3A3A3] shrink-0 font-mono">
                  {new Date(m.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
