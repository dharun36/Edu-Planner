import React, { useState } from 'react';
import { useAuth } from '../../components/auth/AuthProvider';
import { useTheme } from '../../components/theme/ThemeProvider';
import { authApi } from '../../api/auth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Check } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email] = useState(user?.email || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [yearOfStudy, setYearOfStudy] = useState(user?.year_of_study || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [learningPreferences, setLearningPreferences] = useState(
    'Self-paced conceptual mastery with hands-on implementation and algorithmic verification.'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const updated = await authApi.updateProfile({
        full_name: fullName.trim() || undefined,
        department: department.trim() || undefined,
        year_of_study: yearOfStudy.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      updateUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError('Failed to update profile settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 border-b border-[#E5E5E5] pb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
          Settings
        </span>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A] mt-1">
          Profile
        </h1>
        <p className="text-sm text-[#737373]">
          Manage your personal details and learning preferences.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-white border border-[#262626] text-[#0A0A0A] rounded-lg">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 text-xs bg-[#F5F5F5] border border-[#0A0A0A] text-[#0A0A0A] rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-[#0A0A0A] shrink-0" />
          <span>Profile changes saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-white border border-[#E5E5E5] rounded-xl p-6 sm:p-8">
        {/* Name & Email */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
              Name
            </label>
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
              Email Address
            </label>
            <Input
              disabled
              value={email}
              className="bg-[#FAFAFA] text-[#737373] cursor-not-allowed"
            />
          </div>
        </div>

        {/* Academic Background */}
        <div className="space-y-4 border-t border-[#E5E5E5] pt-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Academic background
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#525252]">
                Major / Department
              </label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#525252]">
                Year of Study
              </label>
              <Input
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value)}
                placeholder="e.g. 3rd Year"
              />
            </div>
          </div>
        </div>

        {/* Appearance & Theme */}
        <div className="space-y-4 border-t border-[#E5E5E5] pt-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Appearance
          </span>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#525252]">
              Theme Mode
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  theme === 'light'
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-[#E5E5E5] bg-white text-[#525252] hover:border-[#A3A3A3]'
                }`}
              >
                Light Monochrome
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  theme === 'dark'
                    ? 'border-[#FAFAFA] bg-[#FAFAFA] text-[#0A0A0A] font-semibold'
                    : 'border-[#E5E5E5] bg-white text-[#525252] hover:border-[#A3A3A3]'
                }`}
              >
                Dark Monochrome
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E5E5E5] flex justify-end">
          <Button type="submit" variant="primary" size="md" isLoading={isSaving}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
