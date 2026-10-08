import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Badge } from '../../components/common/Badge';
import {
  learningPlansApi,
  LearningPlan,
  LearningTask,
  LearningModule,
} from '../../api/learningPlans';
import { skillsApi, SkillScore } from '../../api/skills';
import { progressApi, StudentProgressSummary } from '../../api/progress';
import {
  ArrowRight,
  Target,
  Sparkles,
  BookOpen,
  Check,
  ChevronRight,
  Brain,
  Layers,
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activePlan, setActivePlan] = useState<LearningPlan | null>(null);
  const [skills, setSkills] = useState<SkillScore[]>([]);
  const [progressSummary, setProgressSummary] = useState<StudentProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [planRes, skillsRes, summaryRes] = await Promise.allSettled([
        learningPlansApi.getActivePlan(),
        skillsApi.getRawSkills(),
        progressApi.getSummary(),
      ]);

      if (planRes.status === 'fulfilled') {
        setActivePlan(planRes.value);
      }
      if (skillsRes.status === 'fulfilled') {
        setSkills(skillsRes.value || []);
      }
      if (summaryRes.status === 'fulfilled') {
        setProgressSummary(summaryRes.value);
      }
    } catch {
      // Keep state intact
    } finally {
      setIsLoading(false);
    }
  };

  // Compute greeting based on local time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.full_name?.split(' ')[0] || 'Student';

  // Compute active task / module
  let currentModule: LearningModule | null = null;
  let currentTask: LearningTask | null = null;
  let moduleIndex = 1;
  let totalModules = 1;
  let totalTasks = 0;
  let completedTasks = 0;

  if (activePlan && activePlan.modules) {
    totalModules = activePlan.modules.length;
    for (let i = 0; i < activePlan.modules.length; i++) {
      const mod = activePlan.modules[i];
      for (const t of mod.tasks || []) {
        totalTasks++;
        if (t.is_completed) {
          completedTasks++;
        } else if (!currentTask) {
          currentTask = t;
          currentModule = mod;
          moduleIndex = i + 1;
        }
      }
    }
    // If all tasks are completed, pick the last module
    if (!currentTask && activePlan.modules.length > 0) {
      currentModule = activePlan.modules[activePlan.modules.length - 1];
      moduleIndex = activePlan.modules.length;
    }
  }

  // Calculate overall mastery
  const avgSkillScore =
    skills.length > 0
      ? Math.round(skills.reduce((acc, s) => acc + s.score, 0) / skills.length)
      : progressSummary?.average_skill_score ?? 60;

  // Recommended next step: find lowest skill or fallback
  const lowestSkill =
    skills.length > 0
      ? [...skills].sort((a, b) => a.score - b.score)[0]
      : null;

  const currentTopic = activePlan?.topic || user?.learning_topic || 'Data Structures & Algorithms';

  return (
    <div className="max-w-3xl mx-auto py-2 sm:py-6 space-y-10">
      {/* 1. Greeting & Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A]">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-[#737373] mt-1">
          Here is your current adaptive learning standing and next milestone.
        </p>
      </div>

      {/* 2. Your Current Goal */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Your current goal
          </span>
          {activePlan && (
            <Badge variant="developing">
              Path in progress
            </Badge>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#0A0A0A]">
              {currentTopic}
            </h2>
            <p className="text-sm text-[#737373]">
              {activePlan?.learning_goal ||
                user?.learning_goal ||
                'Personalized adaptive learning path configured for foundational mastery.'}
            </p>
          </div>

          <div className="shrink-0">
            {currentTask ? (
              <Button
                variant="primary"
                onClick={() => navigate(`/student/learn/${currentTask?.id}`)}
              >
                Continue Learning
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : activePlan ? (
              <Button
                variant="primary"
                onClick={() => navigate('/student/plan')}
              >
                View Learning Path
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => navigate('/student/goal')}
              >
                Set Learning Goal
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* 3. Current Progress */}
      <section className="space-y-3 pt-4 border-t border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Current Progress
          </span>
          <span className="text-xs text-[#737373]">
            {totalTasks > 0 ? `${completedTasks} of ${totalTasks} tasks completed` : 'Assessment initialized'}
          </span>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0A0A0A]">
            {avgSkillScore}%
          </span>
          <span className="text-sm text-[#737373]">Overall mastery</span>
        </div>

        <ProgressBar value={avgSkillScore} size="md" variant="adaptive" />
      </section>

      {/* 4. Continue Learning (Current In-Progress Task/Module) */}
      <section className="space-y-4 pt-4 border-t border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Continue Learning
          </span>
          {currentModule && (
            <span className="text-xs text-[#737373]">
              Module {moduleIndex} of {totalModules}
            </span>
          )}
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#0A0A0A]">
                {currentTask?.title || currentModule?.title || 'Foundational Principles'}
              </span>
              <Badge variant="neutral">
                {currentTask?.task_type || 'Lesson'}
              </Badge>
            </div>
            <p className="text-xs text-[#737373] max-w-md">
              {currentTask?.description ||
                currentModule?.description ||
                'Review module notes and practice algorithmic concepts to build mastery.'}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {currentTask ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/student/learn/${currentTask?.id}`)}
              >
                Open
                <ChevronRight className="w-3.5 h-3.5 ml-1 text-[#737373]" />
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/student/plan')}
              >
                View Plan
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* 5. Skill Snapshot */}
      <section className="space-y-4 pt-4 border-t border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Skill Snapshot
          </span>
          <button
            onClick={() => navigate('/student/skills')}
            className="text-xs font-medium text-[#0A0A0A] hover:underline"
          >
            View Full Model →
          </button>
        </div>

        {skills.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-[#E5E5E5] rounded-xl bg-white space-y-2">
            <p className="text-xs text-[#737373]">
              No skill scores recorded yet. Complete your diagnostic assessment to initialize your learner model.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/student/assessment')}
            >
              Take Assessment
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E5E5] rounded-xl divide-y divide-[#E5E5E5]">
            {skills.slice(0, 5).map((sk) => {
              const scorePct = Math.round(sk.score);
              return (
                <div
                  key={sk.id}
                  className="p-4 flex items-center justify-between gap-4 text-sm"
                >
                  <span className="font-medium text-[#0A0A0A] min-w-0 truncate">
                    {sk.skill_category}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 sm:w-32 bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          scorePct >= 70
                            ? 'bg-[#0A0A0A]'
                            : scorePct >= 40
                            ? 'bg-[#525252]'
                            : 'bg-[#A3A3A3]'
                        }`}
                        style={{ width: `${Math.max(4, scorePct)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-[#0A0A0A] w-8 text-right">
                      {scorePct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Recommended Next Step */}
      <section className="space-y-4 pt-4 border-t border-[#E5E5E5]">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
          Recommended Next Step
        </span>

        <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#0A0A0A]">
                {lowestSkill ? lowestSkill.skill_category : currentTopic}
              </h3>
              <p className="text-sm text-[#737373] mt-1 max-w-lg leading-relaxed">
                {lowestSkill
                  ? `Based on your recent assessment, ${lowestSkill.skill_category} is currently rated at ${Math.round(
                      lowestSkill.score
                    )}% and represents your highest-priority improvement opportunity.`
                  : 'Based on your diagnostic profile, advancing your core topics is your highest-priority step.'}
              </p>
            </div>
            <Badge variant="needs_attention">
              High Priority
            </Badge>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (activePlan) {
                  navigate('/student/plan');
                } else {
                  navigate('/student/goal');
                }
              }}
            >
              Start
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
