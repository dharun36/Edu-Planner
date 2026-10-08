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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Layers className="w-7 h-7 text-primary" />
          Academic Structure
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure departments and courses to organize student cohorts and curriculums.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Departments Section */}
          <Card className="border-white/5 bg-surface/60">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-neutral-400" />
                  Departments ({departments.length})
                </CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Faculty divisions</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setDeptError('');
                  setIsDeptModalOpen(true);
                }}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Department
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {departments.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No departments created yet.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {departments.map((dept) => {
                    const deptProgramsCount = programs.filter(
                      (p) => p.department_id === dept.id
                    ).length;

                    return (
                      <div key={dept.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                        <div>
                          <p className="text-sm font-semibold text-white">{dept.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {dept.code && (
                              <span className="font-mono bg-white/5 px-2 py-0.5 rounded">
                                {dept.code}
                              </span>
                            )}
                            <span>{deptProgramsCount} courses</span>
                          </div>
                          {dept.description && (
                            <p className="text-xs text-gray-500 mt-1">{dept.description}</p>
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
          <Card className="border-white/5 bg-surface/60">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-neutral-400" />
                  Courses ({programs.length})
                </CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Courses offered by the department</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
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
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Course
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {programs.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No courses added yet.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {programs.map((program) => {
                    const dept = departments.find((d) => d.id === program.department_id);

                    return (
                      <div key={program.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                        <div>
                          <p className="text-sm font-semibold text-white">{program.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {program.code && (
                              <span className="font-mono bg-white/5 px-2 py-0.5 rounded">
                                {program.code}
                              </span>
                            )}
                            <span className="text-neutral-300">{dept?.name || 'Unknown Department'}</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setIsDeptModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-neutral-400" />
              Add Department
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Create an academic division (e.g. Computer Science, Mechanical).
            </p>

            {deptError && (
              <div className="mb-4 p-3 text-xs bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 rounded-xl flex items-center gap-2">
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
                <label className="text-sm font-medium text-gray-300">Description</label>
                <textarea
                  className="w-full bg-surface-light border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  rows={3}
                  placeholder="Optional department notes"
                  value={deptForm.description || ''}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="ghost" onClick={() => setIsDeptModalOpen(false)}>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setIsProgramModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-neutral-400" />
              Add Course
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Create a specific degree course under a department.
            </p>

            {programError && (
              <div className="mb-4 p-3 text-xs bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{programError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProgram} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Department *</label>
                <select
                  className="w-full bg-surface-light border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500/50"
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

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="ghost" onClick={() => setIsProgramModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="secondary" isLoading={isProgramSubmitting}>
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
