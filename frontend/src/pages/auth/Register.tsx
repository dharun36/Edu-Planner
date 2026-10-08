import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { authApi } from '../../api/auth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { KeyRound, ShieldAlert, School } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const initialTab = (searchParams.get('tab') as any) || (initialToken ? 'teacher' : 'institutional');

  const [activeTab, setActiveTab] = useState<'institutional' | 'teacher'>(
    initialTab === 'teacher' ? 'teacher' : 'institutional'
  );

  // Institutional student form state
  const [collegeCode, setCollegeCode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Teacher form state
  const [inviteToken, setInviteToken] = useState(initialToken);
  const [teacherName, setTeacherName] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialToken) {
      setInviteToken(initialToken);
      setActiveTab('teacher');
    }
  }, [initialToken]);

  // Student registration is restricted to college registry records.
  const handleInstitutionalSubmit = async (e: React.FormEvent) => {
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
      navigate('/student/assessment');
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Failed to register. Please confirm your roll number and email are listed in the institutional registry.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Teacher invitation acceptance
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
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:3rem_3rem]" />
      <div className="absolute inset-0 bg-background/90 backdrop-blur-3xl" />

      <Card className="w-full max-w-lg relative z-10 border-white/5 bg-surface/80">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-2 border border-primary/20">
            {activeTab === 'teacher' ? (
              <KeyRound className="w-8 h-8 text-neutral-400" />
            ) : (
              <School className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create your Account</CardTitle>
          <p className="text-gray-400 text-sm">
            Start your personalized adaptive learning journey with EduPlanner.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-surface-light p-1 rounded-xl border border-white/5 mt-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('institutional');
                setError('');
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'institutional'
                  ? 'bg-neutral-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <School className="w-4 h-4" />
              College Registry
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('teacher');
                setError('');
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'teacher'
                  ? 'bg-neutral-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Teacher Invite
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="p-3 mb-5 text-sm bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 rounded-xl flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-neutral-400" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'institutional' && (
            <form onSubmit={handleInstitutionalSubmit} className="space-y-4">
              <div className="p-3 text-xs bg-neutral-500/10 border border-neutral-500/20 text-neutral-300 rounded-xl">
                Pre-authorized student registration verified against your institutional registry.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    College Code
                  </label>
                  <Input
                    required
                    placeholder="e.g. KEC"
                    value={collegeCode}
                    onChange={(e) => setCollegeCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Roll Number / ID
                  </label>
                  <Input
                    required
                    placeholder="e.g. 21CS042"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
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

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Full Name
                </label>
                <Input
                  required
                  placeholder="Full Legal Name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Create Password
                </label>
                <Input
                  required
                  type="password"
                  placeholder="At least 8 characters"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                Verify & Register Account
              </Button>
            </form>
          )}

          {activeTab === 'teacher' && (
            <form onSubmit={handleTeacherSubmit} className="space-y-4">
              <div className="p-3 text-xs bg-neutral-500/10 border border-neutral-500/20 text-neutral-300 rounded-xl">
                Faculty registration requires a valid 7-day invitation link from your College Admin.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Invitation Token
                </label>
                <Input
                  required
                  placeholder="Paste 64-character token"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Full Name
                </label>
                <Input
                  required
                  placeholder="Prof. John Doe"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Create Password
                </label>
                <Input
                  required
                  type="password"
                  placeholder="At least 8 characters"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                Accept Invitation & Activate Account
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
