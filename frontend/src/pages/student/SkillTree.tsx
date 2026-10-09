import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { assessmentApi, Skill } from '../../api/assessment';
import { aiApi } from '../../api/ai';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import {
  Brain,
  Plus,
  ArrowRight,
  X,
  Check,
  TrendingUp,
  Sparkles,
  Award,
  Layers,
  Info,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export default function SkillTree() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Skill plan generation state
  const [generatingSkill, setGeneratingSkill] = useState<string | null>(null);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Add Custom Skill Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    setIsLoading(true);
    try {
      const data = await assessmentApi.getSkills();
      setSkills(data || []);
    } catch {
      // Intentionally quiet
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Directly synthesizes an adaptive learning plan targeting the selected skill
   * and routes the student directly to their newly active plan.
   */
  const handleFocusSkill = async (skillCategory: string) => {
    setGeneratingSkill(skillCategory);
    setGenerationError(null);
    setGenerationNotice(`Synthesizing adaptive learning curriculum for ${skillCategory}...`);

    try {
      await aiApi.generateLearningPlan({
        subject: user?.learning_subject || 'Computer Science',
        topic: skillCategory,
        learning_goal: `Master and understand ${skillCategory} fundamentals, implementation, and algorithmic problem-solving.`,
        college: user?.college || '',
        semester: user?.semester || '',
        regulation: user?.regulation || '',
        year: user?.year_of_study || '',
      });

      setGenerationNotice(`Plan created for ${skillCategory}! Opening your learning path...`);
      // Redirect to the learning plan page with the newly created plan
      setTimeout(() => {
        navigate('/student/plan');
      }, 700);
    } catch (err: any) {
      setGenerationError(
        err.response?.data?.detail || `Failed to generate learning plan for ${skillCategory}. Please try again.`
      );
      setGenerationNotice(null);
      setGeneratingSkill(null);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    setIsAdding(true);
    try {
      await assessmentApi.addCustomSkill(newSkillName.trim());
      await fetchSkills();
      setShowAddModal(false);
      setNewSkillName('');
    } catch {
      alert('Failed to add skill.');
    } finally {
      setIsAdding(false);
    }
  };

  // Derive skill classification
  const getSkillTier = (score: number) => {
    const pct = Math.round(score);
    if (pct >= 80) return { label: 'Mastered', badge: 'mastered' as const, barClass: 'bg-[#0A0A0A]' };
    if (pct >= 60) return { label: 'Proficient', badge: 'developing' as const, barClass: 'bg-[#525252]' };
    if (pct >= 40) return { label: 'Developing', badge: 'developing' as const, barClass: 'bg-[#737373]' };
    return { label: 'Beginner', badge: 'neutral' as const, barClass: 'bg-[#A3A3A3]' };
  };

  // Sort lowest skills for "What to work on next"
  const prioritizedSkills = [...skills].sort((a, b) => a.score - b.score);
  const nextUp = prioritizedSkills.slice(0, 3);

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-10">
      {/* Plan Generation Live Banner */}
      {generationNotice && (
        <div className="p-4 text-xs bg-[#F5F5F5] border border-[#0A0A0A] text-[#0A0A0A] rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" />
            <span className="font-medium">{generationNotice}</span>
          </div>
        </div>
      )}

      {generationError && (
        <div className="p-4 text-xs bg-white border border-[#262626] text-[#0A0A0A] rounded-xl flex items-center justify-between">
          <span>{generationError}</span>
          <button onClick={() => setGenerationError(null)} className="text-[#737373] hover:text-[#0A0A0A]">
            ×
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Learner Model
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A] mt-1">
            Skill Hierarchy & Gaps
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            Your continuous knowledge graph. Competencies adapt automatically based on diagnostic assessments and practice evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Target
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/student/plan')}
          >
            Active Plan
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Objective Assessment Notice (Clarifying why scores are evaluated, not edited manually) */}
      <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-4 flex items-start gap-3 text-xs text-[#525252]">
        <Info className="w-4 h-4 text-[#737373] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Continuous Assessment:</strong> Skill levels are verified objectively through diagnostic tests and task submissions.
          To strengthen a developing skill, click <strong>Focus in Plan</strong> to immediately synthesize a dedicated learning path.
        </p>
      </div>

      {/* SECTION 1: WHAT TO WORK ON NEXT (Targeted Actions) */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0A0A0A]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
              What to work on next
            </span>
          </div>
          <p className="text-xs text-[#737373] mt-0.5">
            Ranked by prerequisite priority and skill gap severity. Click to generate a tailored learning plan.
          </p>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-xl divide-y divide-[#E5E5E5]">
          {nextUp.map((skill, index) => {
            const isGeneratingThis = generatingSkill === skill.skill_category;

            return (
              <div key={skill.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-semibold text-[#737373] w-5 shrink-0 font-mono">
                    0{index + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[#0A0A0A] truncate">
                      {skill.skill_category}
                    </h4>
                    <p className="text-xs text-[#737373] mt-0.5">
                      Current mastery: <strong className="text-[#0A0A0A]">{Math.round(skill.score)}%</strong> — Needs strengthening
                    </p>
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isGeneratingThis}
                    disabled={generatingSkill !== null}
                    onClick={() => handleFocusSkill(skill.skill_category)}
                  >
                    {isGeneratingThis ? (
                      'Synthesizing Plan...'
                    ) : (
                      <>
                        Focus in Plan
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Vertical Skill Hierarchy */}
      <section className="space-y-4 pt-4 border-t border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Knowledge Domain: Computer Science & Algorithmic Concepts
          </span>
          <span className="text-xs text-[#737373]">
            {skills.length} tracked skills
          </span>
        </div>

        {skills.length === 0 ? (
          <div className="text-center py-12 bg-white border border-dashed border-[#E5E5E5] rounded-xl space-y-3">
            <p className="text-xs text-[#737373]">
              No skills registered yet. Take your baseline assessment to generate your initial model.
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
            {skills.map((skill) => {
              const pct = Math.round(skill.score);
              const tier = getSkillTier(pct);

              return (
                <div key={skill.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-semibold text-sm text-[#0A0A0A] truncate">
                        {skill.skill_category}
                      </span>
                      <Badge variant={tier.badge}>{tier.label}</Badge>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold font-mono text-[#0A0A0A]">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Grayscale progress bar */}
                  <div className="w-full bg-[#E5E5E5] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${tier.barClass}`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Skill Modal (Optional custom target) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-xl max-w-sm w-full p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <h3 className="font-semibold text-sm text-[#0A0A0A]">
                Add Knowledge Target
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#737373] hover:text-[#0A0A0A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                  Skill Category Name
                </label>
                <Input
                  required
                  placeholder="e.g. Graph Algorithms"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isAdding}
                >
                  Add Skill
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
