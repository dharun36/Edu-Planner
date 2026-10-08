import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { authApi } from '../../api/auth';
import { skillsApi, SkillScore } from '../../api/skills';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Target,
  BookOpen,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Brain,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export default function LearningGoal() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(user?.learning_subject || 'Data Structures');
  const [topic, setTopic] = useState(user?.learning_topic || 'Binary Search Trees');
  const [learningGoal, setLearningGoal] = useState(
    user?.learning_goal || 'I want to understand and implement Binary Search Trees.'
  );

  const [skills, setSkills] = useState<SkillScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setIsLoading(true);
    try {
      const skillsData = await skillsApi.getRawSkills();
      setSkills(skillsData || []);
    } catch {
      // Non-fatal if skills not loaded yet
    } finally {
      setIsLoading(false);
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
      });

      const token = localStorage.getItem('token') || '';
      if (token) {
        login(token, updatedUser);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Target className="w-7 h-7 text-primary" />
            Learning Goal & Target Context
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            EduPlanner maintains your persistent goal to continuously guide adaptive replanning.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/student/assessment')}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4 text-primary" />
            Re-take Assessment
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/student/generate')}
            className="gap-2 shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-4 h-4" />
            Generate Adaptive Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Learning Goal Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-white/10 bg-surface/90">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Active Learning Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {saveSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-300 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Learning goal updated successfully! Your next plan will adapt to this goal.</span>
                </div>
              )}

              <form onSubmit={handleSaveGoal} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Subject Domain
                  </label>
                  <Input
                    required
                    placeholder="e.g. Data Structures"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Target Topic
                  </label>
                  <Input
                    required
                    placeholder="e.g. Binary Search Trees"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Detailed Learning Goal
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-surface-light border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary text-sm"
                    placeholder="State what you want to achieve or build..."
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Stored persistently — no need to re-enter every session.
                  </span>
                  <Button type="submit" isLoading={isSaving} className="gap-2">
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Skill State Summary */}
        <div className="space-y-6">
          <Card className="border-white/10 bg-surface/90">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-neutral-400" />
                Current Learner Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skills.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-xs text-gray-400">
                    No persistent skills recorded yet. Complete your diagnostic assessment to initialize your learner model.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/student/assessment')}
                    className="text-xs w-full"
                  >
                    Take Assessment Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {skills.slice(0, 5).map((sk) => (
                    <div key={sk.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-gray-300">{sk.skill_category}</span>
                        <span className="font-bold text-primary">{Math.round(sk.score)}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            sk.score >= 70
                              ? 'bg-neutral-500'
                              : sk.score >= 40
                              ? 'bg-neutral-500'
                              : 'bg-neutral-500'
                          }`}
                          style={{ width: `${Math.max(5, sk.score)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/student/skill-tree')}
                      className="w-full text-xs text-gray-400 hover:text-white"
                    >
                      View Full Skill Tree →
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
