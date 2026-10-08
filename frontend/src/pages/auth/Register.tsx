import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { useTheme } from '../../components/theme/ThemeProvider';
import { authApi } from '../../api/auth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Sun, Moon } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const initialTab = (searchParams.get('tab') as any) || (initialToken ? 'teacher' : 'student');

  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>(
    initialTab === 'teacher' ? 'teacher' : 'student'
  );

  // Student form
  const [collegeCode, setCollegeCode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Teacher form
  const [inviteToken, setInviteToken] = useState(initialToken);
  const [teacherName, setTeacherName] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialToken) {
      setInviteToken(initialToken);
      setActiveTab('teacher');
    }
  }, [initialToken]);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { access_token, user } = await authApi.registerStudent(
        collegeCode.trim().toUpperCase(),
        studentId.trim(),
        studentEmail.trim(),
        studentName.trim(),
        studentPassword
      );
      localStorage.setItem('token', access_token);
      login(access_token, user);
      navigate('/student/onboarding');
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Failed to register. Please confirm your roll number and email are listed in the institutional registry.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { access_token, user } = await authApi.acceptTeacherInvitation(
        inviteToken.trim(),
        teacherName.trim(),
        teacherPassword
      );
      localStorage.setItem('token', access_token);
      login(access_token, user);
      const rolePath = user.role.replace('_', '-');
      navigate(`/${rolePath}/dashboard`);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Invalid or expired invitation token. Please check with your College Administrator.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 relative">
      {/* Top right theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#525252] hover:text-[#0A0A0A] transition-colors"
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4 text-[#FAFAFA]" /> : <Moon className="w-4 h-4 text-[#0A0A0A]" />}
      </button>

      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-white text-sm font-bold mx-auto">
            E
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            Create Account
          </h1>
          <p className="text-xs text-[#737373]">
            Start your adaptive learning journey
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 sm:p-8 space-y-5">
          {/* Tabs */}
          <div className="flex border border-[#E5E5E5] rounded-lg p-1 bg-[#FAFAFA]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setError('');
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'student'
                  ? 'bg-white text-[#0A0A0A] shadow-sm font-semibold'
                  : 'text-[#737373] hover:text-[#0A0A0A]'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('teacher');
                setError('');
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'teacher'
                  ? 'bg-white text-[#0A0A0A] shadow-sm font-semibold'
                  : 'text-[#737373] hover:text-[#0A0A0A]'
              }`}
            >
              Faculty Invite
            </button>
          </div>

          {error && (
            <div className="p-3 text-xs bg-white border border-[#262626] text-[#0A0A0A] rounded-lg">
              {error}
            </div>
          )}

          {activeTab === 'student' ? (
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                    College Code
                  </label>
                  <Input
                    required
                    placeholder="e.g. KEC"
                    value={collegeCode}
                    onChange={(e) => setCollegeCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                    Roll / ID
                  </label>
                  <Input
                    required
                    placeholder="e.g. 21CS042"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                  Official Email
                </label>
                <Input
                  required
                  type="email"
                  placeholder="student@institution.edu"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                  Full Name
                </label>
                <Input
                  required
                  placeholder="Legal name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                  Password
                </label>
                <Input
                  required
                  type="password"
                  placeholder="At least 8 characters"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                />
              </div>

              <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
                Register Account
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTeacherSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                  Invitation Token
                </label>
                <Input
                  required
                  placeholder="Token from College Administrator"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                  Full Name
                </label>
                <Input
                  required
                  placeholder="Prof. John Doe"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                  Password
                </label>
                <Input
                  required
                  type="password"
                  placeholder="At least 8 characters"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                />
              </div>

              <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
                Activate Account
              </Button>
            </form>
          )}

          <div className="pt-2 text-center text-xs text-[#737373]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0A0A0A] font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
