import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../components/auth/AuthProvider';
import { useTheme } from '../../components/theme/ThemeProvider';
import { authApi } from '../../api/auth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Sun, Moon } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { access_token, user } = await authApi.login(email, password);
      localStorage.setItem('token', access_token);
      login(access_token, user);

      if (user.role === 'student' && !user.onboarding_complete) {
        navigate('/student/onboarding');
      } else {
        const rolePath = user.role.replace('_', '-');
        navigate(`/${rolePath}/dashboard`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
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

      <div className="w-full max-w-sm space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-white text-sm font-bold mx-auto">
            E
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            EduPlanner
          </h1>
          <p className="text-xs text-[#737373]">
            Adaptive, personalized learning platform
          </p>
        </div>

        {/* Login form card */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#0A0A0A]">Sign in</h2>
            <p className="text-xs text-[#737373]">Enter your credentials to access your workspace</p>
          </div>

          {error && (
            <div className="p-3 text-xs bg-white border border-[#262626] text-[#0A0A0A] rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                Email
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-[#525252]">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-[#737373]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#0A0A0A] font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
