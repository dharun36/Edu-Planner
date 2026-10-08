import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  UserPlus,
  MailPlus,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  collegeAdminApi,
  CollegeStats,
  StudentRegistryRecord,
  TeacherRecord,
  Department,
} from '../../api/collegeAdmin';
import { useAuth } from '../../components/auth/AuthProvider';

export default function CollegeAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CollegeStats | null>(null);
  const [students, setStudents] = useState<StudentRegistryRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsData, studentsData, teachersData, deptsData] = await Promise.all([
        collegeAdminApi.getStats(),
        collegeAdminApi.listStudents(),
        collegeAdminApi.listTeachers(),
        collegeAdminApi.listDepartments(),
      ]);
      setStats(statsData);
      setStudents(studentsData);
      setTeachers(teachersData);
      setDepartments(deptsData);
    } catch (err) {
      console.error('Failed to load college admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const registeredPercentage =
    stats && stats.total_students > 0
      ? Math.round((stats.registered_students / stats.total_students) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-surface to-surface p-6 rounded-2xl border border-primary/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold mb-3 border border-primary/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Institutional Portal
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Welcome, {user?.full_name}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your college's student registry, faculty invitations, and academic structure.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/college-admin/students">
            <Button className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Enroll Students
            </Button>
          </Link>
          <Link to="/college-admin/teachers">
            <Button variant="secondary" className="flex items-center gap-2">
              <MailPlus className="w-4 h-4" />
              Invite Faculty
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-white/5 bg-surface/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Student Registry</span>
              <div className="w-10 h-10 rounded-xl bg-neutral-500/10 flex items-center justify-center text-neutral-400 border border-neutral-500/20">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-white">{stats?.total_students ?? 0}</h3>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <span className="text-neutral-400 font-semibold">{stats?.registered_students ?? 0}</span> registered ({registeredPercentage}%)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-surface/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Active Faculty</span>
              <div className="w-10 h-10 rounded-xl bg-neutral-500/10 flex items-center justify-center text-neutral-400 border border-neutral-500/20">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-white">{stats?.total_teachers ?? 0}</h3>
              <p className="text-xs text-gray-400 mt-1">Verified educators</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-surface/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Departments</span>
              <div className="w-10 h-10 rounded-xl bg-neutral-500/10 flex items-center justify-center text-neutral-400 border border-neutral-500/20">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-white">{stats?.total_departments ?? 0}</h3>
              <p className="text-xs text-gray-400 mt-1">Active academic units</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-surface/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Courses</span>
              <div className="w-10 h-10 rounded-xl bg-neutral-500/10 flex items-center justify-center text-neutral-400 border border-neutral-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-white">{stats?.total_programs ?? 0}</h3>
              <p className="text-xs text-gray-400 mt-1">Undergraduate & postgraduate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Columns: Recent Registry Entries & Faculty Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Student Registry Snippet */}
        <Card className="border-white/5 bg-surface/60">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold text-white">Student Registry</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Pre-authorized student roster</p>
            </div>
            <Link
              to="/college-admin/students"
              className="text-xs text-primary hover:text-neutral-400 flex items-center gap-1 font-medium"
            >
              View All ({students.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No students enrolled in registry yet.
                <div className="mt-3">
                  <Link to="/college-admin/students">
                    <Button size="sm">Add Student</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {students.slice(0, 5).map((student) => (
                  <div key={student.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                    <div>
                      <p className="text-sm font-medium text-white">{student.full_name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {student.student_identifier} • {student.official_email}
                      </p>
                    </div>
                    <div>
                      {student.status === 'registered' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 font-medium">
                          <Clock className="w-3 h-3" />
                          Pending Sign-Up
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Faculty List Snippet */}
        <Card className="border-white/5 bg-surface/60">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold text-white">College Faculty</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Instructors with active classroom access</p>
            </div>
            <Link
              to="/college-admin/teachers"
              className="text-xs text-primary hover:text-neutral-400 flex items-center gap-1 font-medium"
            >
              Manage ({teachers.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {teachers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No faculty registered yet.
                <div className="mt-3">
                  <Link to="/college-admin/teachers">
                    <Button size="sm" variant="secondary">Invite Teacher</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {teachers.slice(0, 5).map((teacher) => (
                  <div key={teacher.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-neutral-500/10 border border-neutral-500/20 flex items-center justify-center text-neutral-400 font-semibold text-sm">
                        {teacher.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{teacher.full_name}</p>
                        <p className="text-xs text-gray-400">{teacher.email}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                        teacher.is_active
                          ? 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                          : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                      }`}>
                        {teacher.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Academic Units Overview */}
      <Card className="border-white/5 bg-surface/60">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold text-white">Academic Departments</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Configured departments & curricular units</p>
          </div>
          <Link
            to="/college-admin/academic"
            className="text-xs text-primary hover:text-neutral-400 flex items-center gap-1 font-medium"
          >
            Manage Structure
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-6">
          {departments.length === 0 ? (
            <p className="text-sm text-gray-400">No departments configured yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-3.5 rounded-xl bg-surface-light/50 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <p className="text-sm font-semibold text-white">{dept.name}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Code: {dept.code || 'N/A'}
                  </p>
                  {dept.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{dept.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
