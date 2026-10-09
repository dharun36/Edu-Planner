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
  Upload,
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
        <Loader2 className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA] animate-spin" />
      </div>
    );
  }

  const registeredPercentage =
    stats && stats.total_students > 0
      ? Math.round((stats.registered_students / stats.total_students) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-[#171717] rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F5F5F5] dark:bg-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] text-[11px] font-semibold mb-2 border border-[#E5E5E5] dark:border-[#333333]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Institutional Portal
          </div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
            Welcome, {user?.full_name}
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Manage your college's student registry, faculty invitations, and academic structure.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/college-admin/materials">
            <Button variant="outline" className="flex items-center gap-2 text-xs">
              <Upload className="w-4 h-4" />
              Course Materials (RAG)
            </Button>
          </Link>
          <Link to="/college-admin/students">
            <Button className="flex items-center gap-2 text-xs">
              <UserPlus className="w-4 h-4" />
              Enroll Students
            </Button>
          </Link>
          <Link to="/college-admin/teachers">
            <Button variant="outline" className="flex items-center gap-2 text-xs">
              <MailPlus className="w-4 h-4" />
              Invite Faculty
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">
                Student Registry
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] flex items-center justify-center text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333]">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">
                {stats?.total_students ?? 0}
              </h3>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
                <span className="text-[#0A0A0A] dark:text-[#FAFAFA] font-medium">{stats?.registered_students ?? 0}</span> registered ({registeredPercentage}%)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">
                Active Faculty
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] flex items-center justify-center text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">
                {stats?.total_teachers ?? 0}
              </h3>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">Verified educators</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">
                Departments
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] flex items-center justify-center text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333]">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">
                {stats?.total_departments ?? 0}
              </h3>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">Active academic units</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">
                Courses
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] flex items-center justify-center text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333]">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">
                {stats?.total_programs ?? 0}
              </h3>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">Curricular courses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Columns: Recent Registry Entries & Faculty Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Registry Snippet */}
        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E5E5] dark:border-[#262626] px-5 py-4">
            <div>
              <CardTitle className="text-sm font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
                Student Registry
              </CardTitle>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">Pre-authorized student roster</p>
            </div>
            <Link
              to="/college-admin/students"
              className="text-xs text-[#0A0A0A] dark:text-[#FAFAFA] hover:underline flex items-center gap-1 font-medium"
            >
              View All ({students.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <div className="p-8 text-center text-[#737373] text-xs">
                No students enrolled in registry yet.
                <div className="mt-3">
                  <Link to="/college-admin/students">
                    <Button size="sm">Add Student</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
                {students.slice(0, 5).map((student) => (
                  <div key={student.id} className="p-4 flex items-center justify-between hover:bg-[#F5F5F5]/60 dark:hover:bg-[#202020]/60 transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">{student.full_name}</p>
                      <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] font-mono mt-0.5">
                        {student.student_identifier} • {student.official_email}
                      </p>
                    </div>
                    <div>
                      {student.status === 'registered' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-[#0A0A0A] text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A] font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-[#F5F5F5] dark:bg-[#262626] text-[#525252] dark:text-[#A3A3A3] border border-[#E5E5E5] dark:border-[#333333] font-medium">
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
        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E5E5] dark:border-[#262626] px-5 py-4">
            <div>
              <CardTitle className="text-sm font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">College Faculty</CardTitle>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">Instructors with active classroom access</p>
            </div>
            <Link
              to="/college-admin/teachers"
              className="text-xs text-[#0A0A0A] dark:text-[#FAFAFA] hover:underline flex items-center gap-1 font-medium"
            >
              Manage ({teachers.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {teachers.length === 0 ? (
              <div className="p-8 text-center text-[#737373] text-xs">
                No faculty registered yet.
                <div className="mt-3">
                  <Link to="/college-admin/teachers">
                    <Button size="sm" variant="outline">Invite Teacher</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
                {teachers.slice(0, 5).map((teacher) => (
                  <div key={teacher.id} className="p-4 flex items-center justify-between hover:bg-[#F5F5F5]/60 dark:hover:bg-[#202020]/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E5E5E5] dark:bg-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center justify-center font-semibold text-xs">
                        {teacher.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">{teacher.full_name}</p>
                        <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] font-mono">{teacher.email}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-md font-medium ${
                        teacher.is_active
                          ? 'bg-[#0A0A0A] text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A]'
                          : 'text-[#737373] border border-[#E5E5E5] dark:border-[#262626]'
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
      <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E5E5] dark:border-[#262626] px-5 py-4">
          <div>
            <CardTitle className="text-sm font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">Academic Departments</CardTitle>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">Configured departments & curricular units</p>
          </div>
          <Link
            to="/college-admin/academic"
            className="text-xs text-[#0A0A0A] dark:text-[#FAFAFA] hover:underline flex items-center gap-1 font-medium"
          >
            Manage Structure
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-5">
          {departments.length === 0 ? (
            <p className="text-xs text-[#737373]">No departments configured yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-3.5 rounded-lg bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626]"
                >
                  <p className="text-xs font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">{dept.name}</p>
                  <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] mt-1 font-mono">
                    Code: {dept.code || 'N/A'}
                  </p>
                  {dept.description && (
                    <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1 line-clamp-1">{dept.description}</p>
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
