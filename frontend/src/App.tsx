import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { ProtectedRoute } from './routes/ProtectedRoute';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Student
import StudentLayout from './layouts/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import Onboarding from './pages/student/Onboarding';
import Assessment from './pages/student/Assessment';
import LearningPlanGenerator from './pages/student/LearningPlanGenerator';
import SkillTree from './pages/student/SkillTree';
import Materials from './pages/student/Materials';
import Progress from './pages/student/Progress';
import Profile from './pages/student/Profile';
import LearningGoal from './pages/student/LearningGoal';
import TaskWorkspace from './pages/student/TaskWorkspace';
import VerificationTest from './pages/student/VerificationTest';

// Teacher
import TeacherLayout from './layouts/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentViewer from './pages/teacher/StudentViewer';

// College Admin
import CollegeAdminLayout from './layouts/CollegeAdminLayout';
import CollegeAdminDashboard from './pages/college_admin/CollegeAdminDashboard';
import StudentRegistryManager from './pages/college_admin/StudentRegistryManager';
import TeacherInviteManager from './pages/college_admin/TeacherInviteManager';
import AcademicStructureManager from './pages/college_admin/AcademicStructureManager';

// Platform Admin
import PlatformAdminLayout from './layouts/PlatformAdminLayout';
import PlatformAdminDashboard from './pages/platform_admin/PlatformAdminDashboard';
import CollegeManager from './pages/platform_admin/CollegeManager';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Student Routes */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route element={<StudentLayout />}>
                <Route path="/student/onboarding" element={<Onboarding />} />
                <Route path="/student/assessment" element={<Assessment />} />
                <Route element={<ProtectedRoute allowedRoles={['student']} requireAssessmentComplete />}>
                  <Route path="/student/dashboard" element={<StudentDashboard />} />
                  <Route path="/student/goal" element={<LearningGoal />} />
                  <Route path="/student/generate" element={<LearningPlanGenerator />} />
                  <Route path="/student/plan" element={<LearningPlanGenerator />} />
                  <Route path="/student/learn/:taskId" element={<TaskWorkspace />} />
                  <Route path="/student/verify/:planId" element={<VerificationTest />} />
                  <Route path="/student/skill-tree" element={<SkillTree />} />
                  <Route path="/student/skills" element={<SkillTree />} />
                  <Route path="/student/materials" element={<Materials />} />
                  <Route path="/student/progress" element={<Progress />} />
                  <Route path="/student/profile" element={<Profile />} />
                </Route>
              </Route>
            </Route>

            {/* Protected Teacher Routes */}
            <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
              <Route element={<TeacherLayout />}>
                <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                <Route path="/teacher/students" element={<StudentViewer />} />
                <Route path="/teacher/materials" element={<Materials />} />
              </Route>
            </Route>

            {/* Protected College Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['college_admin']} />}>
              <Route element={<CollegeAdminLayout />}>
                <Route path="/college-admin/dashboard" element={<CollegeAdminDashboard />} />
                <Route path="/college-admin/students" element={<StudentRegistryManager />} />
                <Route path="/college-admin/teachers" element={<TeacherInviteManager />} />
                <Route path="/college-admin/academic" element={<AcademicStructureManager />} />
              </Route>
            </Route>

            {/* Protected Platform Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['platform_admin']} />}>
              <Route element={<PlatformAdminLayout />}>
                <Route path="/platform-admin/dashboard" element={<PlatformAdminDashboard />} />
                <Route path="/platform-admin/colleges" element={<CollegeManager />} />
              </Route>
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
