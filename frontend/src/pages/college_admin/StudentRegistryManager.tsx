import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-primary" />
            Institutional Student Registry
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Pre-authorize eligible students. Students cannot create accounts unless their roll number and email are enrolled here.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Enroll Student
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-white/5 bg-surface/60">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, roll no, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-light border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-light border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
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
      <Card className="border-white/5 bg-surface/60">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              No students found matching current filters.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-light/50 border-b border-white/5 text-gray-400 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Student ID / Roll No</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Official Email</th>
                  <th className="px-6 py-4">Batch / Semester</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-mono font-medium text-white">
                      {student.student_identifier}
                    </td>
                    <td className="px-6 py-4 text-gray-200 font-medium">{student.full_name}</td>
                    <td className="px-6 py-4 text-gray-400">{student.official_email}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {student.batch_year || '—'}{' '}
                      {student.current_semester ? `(Sem ${student.current_semester})` : ''}
                    </td>
                    <td className="px-6 py-4">
                      {student.status === 'registered' ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Registered
                        </span>
                      ) : student.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 font-medium">
                          <Clock className="w-3 h-3" />
                          Pending Sign-Up
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 font-medium">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {student.status !== 'registered' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(student)}
                          className={`text-xs ${
                            student.status === 'inactive'
                              ? 'text-neutral-400 hover:text-neutral-300'
                              : 'text-neutral-400 hover:text-neutral-300'
                          }`}
                        >
                          {student.status === 'inactive' ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 mr-1" />
                              Activate
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 mr-1" />
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Enroll Student to Registry
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              The student will be able to register an account using this Roll Number and Email.
            </p>

            {formError && (
              <div className="mb-4 p-3 text-xs bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 rounded-xl flex items-center gap-2">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Department</label>
                  <select
                    className="w-full bg-surface-light border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
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

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="ghost"
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
