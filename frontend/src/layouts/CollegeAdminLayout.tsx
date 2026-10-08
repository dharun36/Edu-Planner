import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthProvider';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Building2,
  LogOut,
  X,
  School,
  MailCheck,
} from 'lucide-react';
import { cn } from '../utils/cn';

export default function CollegeAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/college-admin/dashboard', icon: LayoutDashboard },
    { name: 'Student Registry', path: '/college-admin/students', icon: GraduationCap },
    { name: 'Faculty & Invites', path: '/college-admin/teachers', icon: Users },
    { name: 'Departments & Courses', path: '/college-admin/academic', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-white/5 transform transition-transform duration-200 ease-in-out flex flex-col lg:translate-x-0 lg:static",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/30">
              <School className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-bold tracking-wide text-gray-100 block text-sm">EduPlanner</span>
              <span className="text-[10px] text-primary uppercase font-semibold tracking-wider">
                College Portal
              </span>
            </div>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors text-sm",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-100"
                )
              }
              onClick={() => setIsSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-neutral-500/10 hover:text-neutral-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Content */}
        <main className="relative flex-1 overflow-y-auto p-4 pt-16 lg:p-8">
          <button
            className="fixed left-4 top-4 z-30 rounded-lg border border-neutral-700 bg-surface p-2 text-gray-400 shadow-lg hover:bg-neutral-800 hover:text-white lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <School className="h-5 w-5" />
          </button>
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
