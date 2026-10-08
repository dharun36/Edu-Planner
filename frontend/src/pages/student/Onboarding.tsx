import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { useTheme } from '../../components/theme/ThemeProvider';
import { authApi } from '../../api/auth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ArrowRight, Check, Sun, Moon } from 'lucide-react';

export default function Onboarding() {
  const { user, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subject, setSubject] = useState(user?.learning_subject || 'Data Structures');
  const [topic, setTopic] = useState(user?.learning_topic || 'Binary Search Trees');
  const [goal, setGoal] = useState(
    user?.learning_goal || 'I want to understand and implement Binary Search Trees.'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !topic.trim()) {
      setError('Please provide both a subject domain and topic.');
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      const updatedUser = await authApi.updateProfile({
        learning_subject: subject.trim(),
        learning_topic: topic.trim(),
        learning_goal: goal.trim(),
      });
      const token = localStorage.getItem('token') || '';
      if (token) {
        login(token, updatedUser);
      }
      navigate('/student/plan');
    } catch {
      setError('Failed to save learning goal. Continuing to learning plan.');
      navigate('/student/plan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12 relative">
      {/* Top right theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#525252] hover:text-[#0A0A0A] transition-colors"
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4 text-[#FAFAFA]" /> : <Moon className="w-4 h-4 text-[#0A0A0A]" />}
      </button>

      <div className="w-full max-w-md space-y-8">
        {/* Monochromatic Progress Indicator: ✓ Assessment ─── ● Course ─── ○ Plan */}
        <div className="flex items-center justify-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-[#0A0A0A]">
            <div className="w-4 h-4 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-[10px] font-bold">
              ✓
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase">Assessment</span>
          </div>
          <div className="w-8 h-px bg-[#0A0A0A]" />
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0A0A0A]" />
            <span className="text-[11px] font-semibold text-[#0A0A0A] tracking-wider uppercase">Course & Goal</span>
          </div>
          <div className="w-8 h-px bg-[#E5E5E5]" />
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full border border-[#A3A3A3] bg-white" />
            <span className="text-[11px] text-[#A3A3A3] tracking-wider uppercase">Plan</span>
          </div>
        </div>

        {/* Header Typography */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A]">
            Choose Your Course & Goal
          </h1>
          <p className="text-sm text-[#737373]">
            What course or subject domain would you like to master?
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-white border border-[#262626] text-[#0A0A0A] rounded-lg">
            {error}
          </div>
        )}

        {/* Guided Form */}
        <form onSubmit={handleStepSubmit} className="space-y-5 bg-white border border-[#E5E5E5] rounded-xl p-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
              Course / Subject
            </label>
            <Input
              required
              placeholder="e.g. Data Structures & Algorithms"
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
              Learning Goal
            </label>
            <textarea
              required
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] focus-visible:outline-none focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A] transition-colors"
              placeholder="e.g. I want to understand and implement Binary Search Trees."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-[#737373]">
              Step 2 of 3
            </span>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Continue to Plan
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
