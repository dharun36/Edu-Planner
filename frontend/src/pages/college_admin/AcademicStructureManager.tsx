import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Building2,
  BookOpen,
  Plus,
  ShieldAlert,
  Loader2,
  X,
  Layers,
} from 'lucide-react';
import {
  collegeAdminApi,
  Department,
  Program,
  CreateDepartmentPayload,
  CreateProgramPayload,
} from '../../api/collegeAdmin';

export default function AcademicStructureManager() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Department modal state
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState<CreateDepartmentPayload>({
    name: '',
    code: '',
    description: '',
  });
  const [deptError, setDeptError] = useState('');
  const [isDeptSubmitting, setIsDeptSubmitting] = useState(false);

  // Program modal state
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [programForm, setProgramForm] = useState<CreateProgramPayload>({
    department_id: 0,
    name: '',
    code: '',
    description: '',
  });
  const [programError, setProgramError] = useState('');
  const [isProgramSubmitting, setIsProgramSubmitting] = useState(false);

  useEffect(() => {
    fetchAcademicData();
  }, []);

  const fetchAcademicData = async () => {
    try {
      setIsLoading(true);
      const [deptsData, programsData] = await Promise.all([
        collegeAdminApi.listDepartments(),
        collegeAdminApi.listPrograms(),
      ]);
      setDepartments(deptsData);
      setPrograms(programsData);
    } catch (err) {
      console.error('Failed to fetch academic structure:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeptSubmitting(true);
    setDeptError('');

    try {
      const created = await collegeAdminApi.createDepartment({
        name: deptForm.name.trim(),
        code: deptForm.code?.trim() || undefined,
        description: deptForm.description?.trim() || undefined,
      });
      setDepartments((prev) => [...prev, created]);
      setIsDeptModalOpen(false);
      setDeptForm({ name: '', code: '', description: '' });
    } catch (err: any) {
      setDeptError(err.response?.data?.detail || 'Failed to create department.');
    } finally {
      setIsDeptSubmitting(false);
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProgramSubmitting(true);
    setProgramError('');

    try {
      const created = await collegeAdminApi.createProgram({
        department_id: Number(programForm.department_id),
        name: programForm.name.trim(),
        code: programForm.code?.trim() || undefined,
        description: programForm.description?.trim() || undefined,
      });
      setPrograms((prev) => [...prev, created]);
      setIsProgramModalOpen(false);
      setProgramForm({ department_id: 0, name: '', code: '', description: '' });
    } catch (err: any) {
      setProgramError(err.response?.data?.detail || 'Failed to create program.');
    } finally {
      setIsProgramSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center gap-2.5">
          <Layers className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA]" />
          Academic Structure
        </h1>
        <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
          Configure departments and courses to organize student cohorts and curriculums.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Departments Section */}
          <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E5E5] dark:border-[#262626] px-5 py-4">
              <div>
                <CardTitle className="text-sm font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#737373]" />
                  Departments ({departments.length})
                </CardTitle>
                <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">Faculty divisions</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setDeptError('');
                  setIsDeptModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Department
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {departments.length === 0 ? (
                <div className="p-8 text-center text-[#737373] text-xs">
                  No departments created yet.
                </div>
              ) : (
                <div className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
                  {departments.map((dept) => {
                    const deptProgramsCount = programs.filter(
                      (p) => p.department_id === dept.id
                    ).length;

                    return (
                      <div key={dept.id} className="p-4 flex items-center justify-between hover:bg-[#F5F5F5]/60 dark:hover:bg-[#202020]/60 transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">{dept.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#737373] dark:text-[#A3A3A3]">
                            {dept.code && (
                              <span className="font-mono bg-[#F5F5F5] dark:bg-[#262626] border border-[#E5E5E5] dark:border-[#333333] px-1.5 py-0.5 rounded text-[10px]">
                                {dept.code}
                              </span>
                            )}
                            <span>{deptProgramsCount} courses</span>
                          </div>
                          {dept.description && (
                            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">{dept.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Courses Section */}
          <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E5E5] dark:border-[#262626] px-5 py-4">
              <div>
                <CardTitle className="text-sm font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#737373]" />
                  Courses ({programs.length})
                </CardTitle>
                <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">Courses offered by the department</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={departments.length === 0}
                onClick={() => {
                  setProgramError('');
                  if (departments.length > 0) {
                    setProgramForm((prev) => ({
                      ...prev,
                      department_id: departments[0].id,
                    }));
                  }
                  setIsProgramModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Course
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {programs.length === 0 ? (
                <div className="p-8 text-center text-[#737373] text-xs">
                  No courses added yet.
                </div>
              ) : (
                <div className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
                  {programs.map((program) => {
                    const dept = departments.find((d) => d.id === program.department_id);

                    return (
                      <div key={program.id} className="p-4 flex items-center justify-between hover:bg-[#F5F5F5]/60 dark:hover:bg-[#202020]/60 transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">{program.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#737373] dark:text-[#A3A3A3]">
                            {program.code && (
                              <span className="font-mono bg-[#F5F5F5] dark:bg-[#262626] border border-[#E5E5E5] dark:border-[#333333] px-1.5 py-0.5 rounded text-[10px]">
                                {program.code}
                              </span>
                            )}
                            <span>{dept?.name || 'Department'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] rounded-xl w-full max-w-md p-6 relative shadow-xl">
            <button
              onClick={() => setIsDeptModalOpen(false)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#FAFAFA] mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Add Department
            </h2>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mb-5">
              Create an academic division (e.g. Computer Science, Mechanical).
            </p>

            {deptError && (
              <div className="mb-4 p-3 text-xs bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] rounded-md flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{deptError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDept} className="space-y-4">
              <Input
                label="Department Name *"
                placeholder="e.g. Computer Science & Engineering"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                required
              />

              <Input
                label="Department Code"
                placeholder="e.g. CSE"
                value={deptForm.code || ''}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">
                  Description
                </label>
                <textarea
                  className="w-full bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-md px-3 py-2 text-xs text-[#0A0A0A] dark:text-[#FAFAFA] focus:outline-none focus:border-[#0A0A0A] dark:focus:border-[#FAFAFA]"
                  rows={3}
                  placeholder="Optional department notes"
                  value={deptForm.description || ''}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button type="button" variant="outline" onClick={() => setIsDeptModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isDeptSubmitting}>
                  Save Department
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] rounded-xl w-full max-w-md p-6 relative shadow-xl">
            <button
              onClick={() => setIsProgramModalOpen(false)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#FAFAFA] mb-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Add Course
            </h2>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mb-5">
              Create a specific degree course under a department.
            </p>

            {programError && (
              <div className="mb-4 p-3 text-xs bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] rounded-md flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{programError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProgram} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">
                  Department *
                </label>
                <select
                  className="w-full bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-md px-3 py-2 text-xs text-[#0A0A0A] dark:text-[#FAFAFA] focus:outline-none focus:border-[#0A0A0A] dark:focus:border-[#FAFAFA]"
                  value={programForm.department_id}
                  onChange={(e) =>
                    setProgramForm({ ...programForm, department_id: Number(e.target.value) })
                  }
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Course Name *"
                placeholder="e.g. B.Tech Computer Science"
                value={programForm.name}
                onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                required
              />

              <Input
                label="Course Code"
                placeholder="e.g. BT-CSE"
                value={programForm.code || ''}
                onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
              />

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button type="button" variant="outline" onClick={() => setIsProgramModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isProgramSubmitting}>
                  Save Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
