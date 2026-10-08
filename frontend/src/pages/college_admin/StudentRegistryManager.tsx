import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Loader2,
  UserCheck,
  UserX,
  X,
  Filter,
} from 'lucide-react';
import {
  collegeAdminApi,
  StudentRegistryRecord,
  Department,
  AddStudentRegistryPayload,
} from '../../api/collegeAdmin';

export default function StudentRegistryManager() {
  const [students, setStudents] = useState<StudentRegistryRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState<AddStudentRegistryPayload>({
    student_identifier: '',
    official_email: '',
    full_name: '',
    department_id: undefined,
    batch_year: '',
    current_semester: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [studentsData, deptsData] = await Promise.all([
        collegeAdminApi.listStudents(),
        collegeAdminApi.listDepartments(),
      ]);
      setStudents(studentsData);
      setDepartments(deptsData);
    } catch (err) {
      console.error('Failed to fetch registry data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      const payload: AddStudentRegistryPayload = {
        student_identifier: formData.student_identifier.trim(),
        official_email: formData.official_email.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        department_id: formData.department_id ? Number(formData.department_id) : undefined,
        batch_year: formData.batch_year?.trim() || undefined,
        current_semester: formData.current_semester?.trim() || undefined,
      };

      const newRecord = await collegeAdminApi.addStudentToRegistry(payload);
      setStudents((prev) => [newRecord, ...prev]);
      setIsModalOpen(false);
      setFormData({
        student_identifier: '',
        official_email: '',
        full_name: '',
        department_id: undefined,
        batch_year: '',
        current_semester: '',
      });
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to add student to registry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (student: StudentRegistryRecord) => {
    const newStatus = student.status === 'inactive' ? 'active' : 'inactive';
    try {
      await collegeAdminApi.updateStudentStatus(student.id, newStatus);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, status: newStatus } : s))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update student status');
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.official_email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'registered'
        ? s.status === 'registered'
        : statusFilter === 'pending'
        ? s.status === 'active'
        : s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA]" />
            Institutional Student Registry
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Pre-authorize eligible students. Students cannot create accounts unless their roll number and email are enrolled here.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Enroll Student
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, roll no, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-md pl-10 pr-4 py-2 text-xs text-[#0A0A0A] dark:text-[#FAFAFA] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#0A0A0A] dark:focus:border-[#FAFAFA] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-[#737373] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-md px-3 py-2 text-xs text-[#0A0A0A] dark:text-[#FAFAFA] focus:outline-none focus:border-[#0A0A0A] dark:focus:border-[#FAFAFA]"
            >
              <option value="all">All Statuses ({students.length})</option>
              <option value="registered">Registered</option>
              <option value="pending">Pending Sign-Up</option>
              <option value="inactive">Inactive / Disabled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA] animate-spin" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-[#737373] text-xs">
              No students found matching current filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F5F5] dark:bg-[#202020] border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Student ID / Roll No</th>
                  <th className="px-5 py-3.5">Full Name</th>
                  <th className="px-5 py-3.5">Official Email</th>
                  <th className="px-5 py-3.5">Batch / Semester</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-[#F5F5F5]/60 dark:hover:bg-[#202020]/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">
                      {student.student_identifier}
                    </td>
                    <td className="px-5 py-3.5 text-[#0A0A0A] dark:text-[#FAFAFA] font-medium">
                      {student.full_name}
                    </td>
                    <td className="px-5 py-3.5 text-[#737373] dark:text-[#A3A3A3]">
                      {student.official_email}
                    </td>
                    <td className="px-5 py-3.5 text-[#737373] dark:text-[#A3A3A3]">
                      {student.batch_year || '—'}{' '}
                      {student.current_semester ? `(Sem ${student.current_semester})` : ''}
                    </td>
                    <td className="px-5 py-3.5">
                      {student.status === 'registered' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-[#0A0A0A] text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A] font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Registered
                        </span>
                      ) : student.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-[#F5F5F5] dark:bg-[#262626] text-[#525252] dark:text-[#A3A3A3] border border-[#E5E5E5] dark:border-[#333333] font-medium">
                          <Clock className="w-3 h-3" />
                          Pending Sign-Up
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md text-[#737373] border border-[#E5E5E5] dark:border-[#262626] font-medium">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {student.status !== 'registered' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(student)}
                          className="text-xs h-7 px-2.5"
                        >
                          {student.status === 'inactive' ? (
                            <>
                              <UserCheck className="w-3 h-3 mr-1" />
                              Activate
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3 mr-1" />
                              Deactivate
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] rounded-xl w-full max-w-lg p-6 relative shadow-xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#FAFAFA] mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Enroll Student to Registry
            </h2>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mb-5">
              The student will be able to register an account using this Roll Number and Email.
            </p>

            {formError && (
              <div className="mb-4 p-3 text-xs bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] rounded-md flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Student ID / Roll No *"
                  placeholder="e.g. 21CS001"
                  value={formData.student_identifier}
                  onChange={(e) => setFormData({ ...formData, student_identifier: e.target.value })}
                  required
                />
                <Input
                  label="Official Email *"
                  type="email"
                  placeholder="alex@college.edu"
                  value={formData.official_email}
                  onChange={(e) => setFormData({ ...formData, official_email: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Full Name *"
                placeholder="Alex Morgan"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">
                  Department
                </label>
                <select
                  className="w-full bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-md px-3 py-2 text-xs text-[#0A0A0A] dark:text-[#FAFAFA] focus:outline-none focus:border-[#0A0A0A] dark:focus:border-[#FAFAFA]"
                  value={formData.department_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      department_id: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Batch / Year"
                  placeholder="e.g. 2022-2026"
                  value={formData.batch_year || ''}
                  onChange={(e) => setFormData({ ...formData, batch_year: e.target.value })}
                />
                <Input
                  label="Current Semester"
                  placeholder="e.g. 5"
                  value={formData.current_semester || ''}
                  onChange={(e) => setFormData({ ...formData, current_semester: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Enroll Student
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
