import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessmentApi, Skill } from '../../api/assessment';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import {
  Brain,
  Edit3,
  Plus,
  ArrowRight,
  X,
  Check,
  TrendingUp,
} from 'lucide-react';

export default function SkillTree() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Add Modal state
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editScore, setEditScore] = useState<number>(50);
  const [isUpdating, setIsUpdating] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const navigate = useNavigate();

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

  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    setIsUpdating(true);
    try {
      await assessmentApi.updateSkillScore(editingSkill.id, editScore);
      await fetchSkills();
      setEditingSkill(null);
    } catch {
      alert('Failed to update skill score.');
    } finally {
      setIsUpdating(false);
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
    if (pct >= 75) return { label: 'Advanced', badge: 'mastered' as const, barClass: 'bg-[#0A0A0A]' };
    if (pct >= 50) return { label: 'Intermediate', badge: 'developing' as const, barClass: 'bg-[#525252]' };
    if (pct >= 30) return { label: 'Developing', badge: 'needs_attention' as const, barClass: 'bg-[#737373]' };
    return { label: 'Beginner', badge: 'neutral' as const, barClass: 'bg-[#A3A3A3]' };
  };

  // Sort lowest skills for "What to work on next"
  const prioritizedSkills = [...skills].sort((a, b) => a.score - b.score);
  const nextUp = prioritizedSkills.slice(0, 3);

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-10">
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
            Your continuous knowledge graph. Skills adapt automatically based on diagnostic verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Skill
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/student/plan')}
          >
            Adaptive Plan
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* SECTION 14: Vertical Skill Hierarchy */}
      <section className="space-y-4">
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#0A0A0A]">
                        {skill.skill_category}
                      </span>
                      <Badge variant={tier.badge}>{tier.label}</Badge>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[#0A0A0A]">
                        {pct}%
                      </span>
                      <button
                        onClick={() => {
                          setEditingSkill(skill);
                          setEditScore(pct);
                        }}
                        className="text-[#737373] hover:text-[#0A0A0A] p-1 rounded hover:bg-[#F5F5F5] transition-colors"
                        title="Edit score"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
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

      {/* SECTION 14: What to work on next */}
      <section className="space-y-4 pt-4 border-t border-[#E5E5E5]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            What to work on next
          </span>
          <p className="text-xs text-[#737373] mt-0.5">
            Ranked by prerequisite priority and skill gap severity.
          </p>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-xl divide-y divide-[#E5E5E5]">
          {nextUp.map((skill, index) => (
            <div key={skill.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#737373] w-5">
                  0{index + 1}
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-[#0A0A0A]">
                    {skill.skill_category}
                  </h4>
                  <p className="text-xs text-[#737373]">
                    Current mastery: {Math.round(skill.score)}% — Needs strengthening
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/student/plan')}
              >
                Focus in Plan
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Edit Skill Score Modal */}
      {editingSkill && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-xl max-w-sm w-full p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <h3 className="font-semibold text-sm text-[#0A0A0A]">
                Update {editingSkill.skill_category}
              </h3>
              <button
                onClick={() => setEditingSkill(null)}
                className="text-[#737373] hover:text-[#0A0A0A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateScore} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                  Mastery Score ({editScore}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editScore}
                  onChange={(e) => setEditScore(Number(e.target.value))}
                  className="w-full accent-[#0A0A0A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingSkill(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isUpdating}
                >
                  Save Score
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Skill Modal */}
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
