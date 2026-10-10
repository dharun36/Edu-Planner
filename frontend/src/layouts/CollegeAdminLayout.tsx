import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthProvider';
import { useTheme } from '../components/theme/ThemeProvider';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '../utils/cn';

export default function CollegeAdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/college-admin/dashboard', icon: LayoutDashboard },
    { name: 'Course Materials', path: '/college-admin/materials', icon: BookOpen },
    { name: 'Student Registry', path: '/college-admin/students', icon: GraduationCap },
    { name: 'Faculty & Invites', path: '/college-admin/teachers', icon: Users },
    { name: 'Departments & Courses', path: '/college-admin/academic', icon: Building2 },
  ];

  const currentNav = navItems.find((item) => location.pathname.startsWith(item.path));
  const pageTitle = currentNav?.name || 'College Admin';

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-[#0A0A0A] dark:text-[#FAFAFA] flex flex-col transition-colors duration-150">
      {/* Top Header */}
      <header className="sticky top-0 z-40 h-14 bg-white dark:bg-[#121212] border-b border-[#E5E5E5] dark:border-[#262626] px-4 sm:px-6 flex items-center justify-between transition-colors duration-150">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-md text-[#525252] dark:text-[#A3A3A3] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] hover:bg-[#F5F5F5] dark:hover:bg-[#202020] lg:hidden"
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-[#0A0A0A] dark:bg-white flex items-center justify-center text-white dark:text-[#0A0A0A] text-xs font-bold tracking-tight">
              E
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">
              EduPlanner
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 ml-4 pl-4 border-l border-[#E5E5E5] dark:border-[#262626] text-xs text-[#737373] dark:text-[#A3A3A3]">
            <span>College Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#A3A3A3] dark:text-[#525252]" />
            <span className="text-[#0A0A0A] dark:text-[#FAFAFA] font-medium">{pageTitle}</span>
          </div>
        </div>

        {/* User profile / status on right + Theme toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-[#E5E5E5] dark:border-[#262626] hover:bg-[#F5F5F5] dark:hover:bg-[#202020] text-[#525252] dark:text-[#A3A3A3] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#FAFAFA]" />
            ) : (
              <Moon className="w-4 h-4 text-[#0A0A0A]" />
            )}
          </button>

          <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#525252] dark:text-[#A3A3A3]">
            <div className="w-6 h-6 rounded-full bg-[#E5E5E5] dark:bg-[#262626] text-[#262626] dark:text-[#FAFAFA] flex items-center justify-center font-semibold text-[11px]">
              {(user?.full_name || 'Admin').charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:inline text-xs text-[#262626] dark:text-[#FAFAFA] font-medium">
              {user?.full_name || 'Admin'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex min-h-[calc(100vh-3.5rem)]">
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-14 left-0 z-50 w-56 bg-white dark:bg-[#121212] border-r border-[#E5E5E5] dark:border-[#262626] flex flex-col justify-between transition-all duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-3.5rem)] lg:sticky lg:top-14',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="py-4 px-3 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3] dark:text-[#737373]">
              Navigation
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-[#F5F5F5] dark:bg-[#202020] text-[#0A0A0A] dark:text-[#FAFAFA] font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-[#0A0A0A] dark:before:bg-[#FAFAFA] before:rounded-r'
                      : 'text-[#525252] dark:text-[#A3A3A3] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] hover:bg-[#FAFAFA] dark:hover:bg-[#1A1A1A]'
                  )
                }
              >
                <item.icon className="w-4 h-4 stroke-[1.75]" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          <div className="p-3 border-t border-[#E5E5E5] dark:border-[#262626]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-[#737373] dark:text-[#A3A3A3] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] hover:bg-[#FAFAFA] dark:hover:bg-[#1A1A1A] transition-colors"
            >
              <LogOut className="w-4 h-4 stroke-[1.75]" />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
