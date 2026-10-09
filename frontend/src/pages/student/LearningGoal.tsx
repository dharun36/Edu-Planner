import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { authApi } from '../../api/auth';
import { skillsApi, SkillScore } from '../../api/skills';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';

export default function LearningGoal() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(user?.learning_subject || 'Data Structures');
  const [topic, setTopic] = useState(user?.learning_topic || 'Binary Search Trees');
  const [learningGoal, setLearningGoal] = useState(
    user?.learning_goal || 'I want to understand and implement Binary Search Trees.'
  );

  const [skills, setSkills] = useState<SkillScore[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const skillsData = await skillsApi.getRawSkills();
      setSkills(skillsData || []);
    } catch {
      // Non-fatal
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const updatedUser = await authApi.updateProfile({
        learning_subject: subject.trim(),
        learning_topic: topic.trim(),
        learning_goal: learningGoal.trim(),
        onboarding_complete: true,
      });

      const token = localStorage.getItem('token') || '';
      if (token) {
        login(token, { ...updatedUser, onboarding_complete: true });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update learning goal.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 space-y-8">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A]">
          What would you like to learn?
        </h1>
        <p className="text-sm text-[#737373]">
          Define your target topic and scope. EduPlanner uses this goal to synthesize your personalized learning path.
        </p>
      </div>

      {error && (
        <div className="p-3.5 text-xs bg-white border border-[#262626] text-[#0A0A0A] rounded-lg">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 text-xs bg-[#F5F5F5] border border-[#0A0A0A] text-[#0A0A0A] rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-[#0A0A0A]" />
          <span>Goal updated. Your next learning plan and diagnostic tasks will adapt to this target.</span>
        </div>
      )}

      {/* Main Goal Form */}
      <form onSubmit={handleSaveGoal} className="space-y-6 bg-white border border-[#E5E5E5] rounded-xl p-6 sm:p-8">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
            Subject
          </label>
          <Input
            required
            placeholder="e.g. Data Structures"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
            Topic
          </label>
          <Input
            required
            placeholder="e.g. Binary Search Trees"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
            What is your goal?
          </label>
          <textarea
            required
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] focus-visible:outline-none focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A] transition-colors leading-relaxed"
            placeholder="e.g. I want to understand and implement Binary Search Trees."
            value={learningGoal}
            onChange={(e) => setLearningGoal(e.target.value)}
          />
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E5E5E5]">
          <span className="text-xs text-[#737373]">
            Changes are saved permanently to your profile.
          </span>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button type="submit" variant="secondary" size="md" isLoading={isSaving}>
              Save Changes
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => navigate('/student/plan')}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </form>

      {/* Skill Context Callout */}
      {skills.length > 0 && (
        <div className="border border-[#E5E5E5] bg-[#F5F5F5] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
              Current Learner Model Context
            </span>
            <button
              onClick={() => navigate('/student/skills')}
              className="text-xs font-medium text-[#0A0A0A] hover:underline"
            >
              View All Skills →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {skills.slice(0, 4).map((sk) => (
              <div key={sk.id} className="bg-white border border-[#E5E5E5] p-2.5 rounded-lg flex justify-between items-center">
                <span className="text-[#262626] font-medium">{sk.skill_category}</span>
                <span className="font-semibold text-[#0A0A0A]">{Math.round(sk.score)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
