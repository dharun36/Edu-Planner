import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { useAuth } from '../../components/auth/AuthProvider';
import { Users, BookOpen, AlertCircle, TrendingUp, Loader2, Plus, Copy, Check, School, X, Upload, File as FileIcon, Trash2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { teacherApi, TeacherStats, TeacherActivity, StudentProgress } from '../../api/teacher';
import { classroomApi, Classroom, ClassMember, ClassCreatePayload } from '../../api/classroom';
import { materialsApi, Material } from '../../api/materials';
import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdClassCode, setCreatedClassCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [classForm, setClassForm] = useState<ClassCreatePayload>({
    name: '',
    college: '',
    year: '',
    semester: '',
    regulation: '',
    section: ''
  });

  // View Members Modal
  const [selectedClassForMembers, setSelectedClassForMembers] = useState<Classroom | null>(null);
  const [classMembers, setClassMembers] = useState<ClassMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Upload Material Modal
  const [selectedClassForUpload, setSelectedClassForUpload] = useState<Classroom | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [classMaterials, setClassMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState<number | null>(null);

  // Delete Class Modal
  const [classToDelete, setClassToDelete] = useState<Classroom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, actRes, stdRes, classRes] = await Promise.allSettled([
        teacherApi.getStats(),
        teacherApi.getActivity(),
        teacherApi.getStudents(),
        classroomApi.getTeacherClasses(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (actRes.status === 'fulfilled') setActivities(actRes.value);
      if (stdRes.status === 'fulfilled') setStudents(stdRes.value);
      if (classRes.status === 'fulfilled') setClasses(classRes.value);
    } catch (err) {
      console.error('Failed to load teacher dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClassForm({ ...classForm, [e.target.name]: e.target.value });
  };

  const handleCreateClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.name.trim()) return;
    setIsCreatingClass(true);
    setCreateError('');
    try {
      const newClass = await classroomApi.createClass(classForm);
      setClasses(prev => [newClass, ...prev]);
      setCreatedClassCode(newClass.code);
      setClassForm({ name: '', college: '', year: '', semester: '', regulation: '', section: '' });
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Failed to create class.');
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleViewMembers = async (cls: Classroom) => {
    setSelectedClassForMembers(cls);
    setIsLoadingMembers(true);
    try {
      const members = await classroomApi.getClassMembers(cls.id);
      setClassMembers(members);
    } catch (err) {
      console.error('Failed to fetch class members', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleViewMaterials = async (cls: Classroom) => {
    setSelectedClassForUpload(cls);
    setIsLoadingMaterials(true);
    setUploadError('');
    setUploadSuccess(false);
    try {
      const materials = await materialsApi.list(cls.college || undefined);
      setClassMaterials(materials);
    } catch (err) {
      console.error('Failed to fetch class materials', err);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!selectedClassForUpload) return;
    setIsDeletingMaterial(materialId);
    try {
      await materialsApi.delete(materialId);
      setClassMaterials(prev => prev.filter(m => m.id !== materialId));
    } catch (err) {
      console.error('Failed to delete material', err);
    } finally {
      setIsDeletingMaterial(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setUploadError('');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForUpload || !uploadFile) return;

    setIsUploading(true);
    setUploadError('');
    try {
      const newMaterial = await materialsApi.upload({
        file: uploadFile,
        college: selectedClassForUpload.college || 'General',
        semester: selectedClassForUpload.semester || 'General',
        regulation: selectedClassForUpload.regulation || 'General',
      });
      setClassMaterials(prev => [newMaterial, ...prev]);
      setUploadSuccess(true);
      setUploadFile(null);
      setTimeout(() => {
        setUploadSuccess(false);
      }, 2500);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload material.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await classroomApi.deleteClass(classToDelete.id);
      setClasses(prev => prev.filter(c => c.id !== classToDelete.id));
      setClassToDelete(null);
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || 'Failed to delete class.');
    } finally {
      setIsDeleting(false);
    }
  };

  const needingAttention = students.filter(s => s.average_score < 50 || s.skills_assessed === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#0A0A0A] dark:text-[#FAFAFA] mr-3" />
        <span className="text-xs text-[#737373]">Loading instructor dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">Instructor Dashboard</h1>
        <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
          Welcome back, {user?.full_name}. Real-time analytics and classroom management.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">Total Students</p>
              <p className="text-2xl font-bold text-[#0A0A0A] dark:text-[#FAFAFA]">{stats?.total_students ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">Active Plans</p>
              <p className="text-2xl font-bold text-[#0A0A0A] dark:text-[#FAFAFA]">{stats?.active_plans ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">Avg Completion</p>
              <p className="text-2xl font-bold text-[#0A0A0A] dark:text-[#FAFAFA]">{stats?.avg_completion_rate ?? 0}%</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333] flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">Needs Attention</p>
              <p className="text-2xl font-bold text-[#0A0A0A] dark:text-[#FAFAFA]">{stats?.students_needing_attention ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Classes Section */}
      <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#E5E5E5] dark:border-[#262626] px-5 py-4">
          <div>
            <CardTitle className="text-sm font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center">
              <School className="w-4 h-4 mr-2" /> My Classes
            </CardTitle>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">Manage classrooms, generate class codes, and view enrolled students.</p>
          </div>
          <Button onClick={() => { setShowCreateModal(true); setCreatedClassCode(null); setCreateError(''); }} className="flex items-center gap-2 text-xs">
            <Plus className="w-3.5 h-3.5" /> Create Class
          </Button>
        </CardHeader>
        <CardContent className="p-5">
          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="p-4 rounded-xl bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-sm text-[#0A0A0A] dark:text-[#FAFAFA]">{cls.name}</h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#E5E5E5] dark:bg-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA]">
                        {cls.member_count} {cls.member_count === 1 ? 'Student' : 'Students'}
                      </span>
                    </div>

                    <div className="text-xs space-y-0.5 text-[#737373] dark:text-[#A3A3A3] mb-3">
                      {cls.college && <p><span className="text-[#A3A3A3]">College:</span> {cls.college}</p>}
                      {(cls.year || cls.semester || cls.regulation || cls.section) && (
                        <p>
                          {cls.year && `Year ${cls.year} • `}
                          {cls.semester && `Sem ${cls.semester} • `}
                          {cls.regulation && `Reg ${cls.regulation} `}
                          {cls.section && `(Sec ${cls.section})`}
                        </p>
                      )}
                    </div>

                    {/* Class Code Box */}
                    <div className="p-3 bg-white dark:bg-[#171717] rounded-lg border border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-[#737373] dark:text-[#A3A3A3]">Class Code</p>
                        <p className="text-base font-mono font-bold tracking-wider text-[#0A0A0A] dark:text-[#FAFAFA]">{cls.code}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyCode(cls.code)}
                        className="text-xs flex items-center gap-1 h-7"
                      >
                        {copiedCode === cls.code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#0A0A0A] dark:text-[#FAFAFA]" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-7"
                      onClick={() => handleViewMembers(cls)}
                    >
                      <Users className="w-3 h-3 mr-1" /> Members ({cls.member_count})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-7"
                      onClick={() => handleViewMaterials(cls)}
                    >
                      <BookOpen className="w-3 h-3 mr-1" /> Materials
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2 h-7"
                      onClick={() => setClassToDelete(cls)}
                    >
                      <Trash2 className="w-3 h-3 text-[#737373] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#737373] text-xs">
              No classes created yet. Click <span className="font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">"Create Class"</span> to generate a class code.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-[#E5E5E5] dark:border-[#262626]">
              <CardTitle className="text-sm font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">Recent Student Activity</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/teacher/students')} className="text-xs h-7">
                View All Students
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {activities.length > 0 ? (
                <div className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
                  {activities.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-[#F5F5F5]/60 dark:hover:bg-[#202020]/60 transition-colors">
                      <div>
                        <p className="font-semibold text-xs text-[#0A0A0A] dark:text-[#FAFAFA]">{item.name}</p>
                        <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3]">{item.action}</p>
                      </div>
                      <span className="text-[10px] text-[#737373] dark:text-[#A3A3A3]">
                        {new Date(item.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#737373] text-xs">
                  No recent student activity recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
            <CardHeader className="px-5 py-4 border-b border-[#E5E5E5] dark:border-[#262626]">
              <CardTitle className="text-sm font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">Students Needing Attention</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {needingAttention.length > 0 ? (
                <div className="space-y-3">
                  {needingAttention.map((student) => (
                    <div key={student.user.id} className="flex gap-3 items-start p-3 bg-[#FAFAFA] dark:bg-[#111111] rounded-lg border border-[#E5E5E5] dark:border-[#262626]">
                      <AlertCircle className="w-4 h-4 text-[#737373] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">{student.user.full_name}</p>
                        <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3]">
                          {student.skills_assessed === 0 ? 'Assessment not completed' : `Low average score (${student.average_score}%)`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#737373] py-4 text-center">All students are making good progress!</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center">
                <School className="w-4 h-4 mr-2" /> Create New Class
              </h2>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">Enter details to generate a unique 6-character class code.</p>
            </div>

            {createError && (
              <div className="p-3 bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] text-xs rounded-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
                {createError}
              </div>
            )}

            {createdClassCode ? (
              <div className="space-y-4 py-4 text-center">
                <div className="p-4 bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] rounded-lg">
                  <p className="font-semibold text-xs text-[#0A0A0A] dark:text-[#FAFAFA]">Class Created Successfully!</p>
                  <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">Share this code with your students to let them join.</p>
                </div>

                <div className="p-4 bg-[#FAFAFA] dark:bg-[#111111] rounded-lg border border-[#E5E5E5] dark:border-[#262626] inline-block w-full">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3] mb-1">Generated Class Code</p>
                  <p className="text-2xl font-mono font-bold tracking-widest text-[#0A0A0A] dark:text-[#FAFAFA]">{createdClassCode}</p>
                </div>

                <Button
                  onClick={() => handleCopyCode(createdClassCode)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {copiedCode === createdClassCode ? (
                    <>
                      <Check className="w-4 h-4" /> Copied Code to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Code
                    </>
                  )}
                </Button>

                <Button variant="outline" className="w-full" onClick={() => setShowCreateModal(false)}>
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateClassSubmit} className="space-y-3">
                <Input
                  label="Class Name *"
                  name="name"
                  placeholder="e.g. Web Development"
                  value={classForm.name}
                  onChange={handleFormChange}
                  required
                />
                <Input
                  label="College"
                  name="college"
                  placeholder="e.g. Engineering College"
                  value={classForm.college}
                  onChange={handleFormChange}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Year"
                    name="year"
                    placeholder="4"
                    value={classForm.year}
                    onChange={handleFormChange}
                  />
                  <Input
                    label="Semester"
                    name="semester"
                    placeholder="7"
                    value={classForm.semester}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Regulation"
                    name="regulation"
                    placeholder="2022"
                    value={classForm.regulation}
                    onChange={handleFormChange}
                  />
                  <Input
                    label="Section"
                    name="section"
                    placeholder="A"
                    value={classForm.section}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-[#E5E5E5] dark:border-[#262626]">
                  <Button type="button" variant="outline" className="w-full" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full" disabled={isCreatingClass}>
                    {isCreatingClass ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Class
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Class Members Modal */}
      {selectedClassForMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedClassForMembers(null)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center">
                <Users className="w-4 h-4 mr-2" /> {selectedClassForMembers.name} — Members
              </h2>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">Code: <span className="font-mono font-bold text-[#0A0A0A] dark:text-[#FAFAFA]">{selectedClassForMembers.code}</span></p>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-2">
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0A0A0A] dark:text-[#FAFAFA] mr-2" />
                  <span className="text-xs text-[#737373]">Loading enrolled students...</span>
                </div>
              ) : classMembers.length > 0 ? (
                classMembers.map((m) => (
                  <div key={m.id} className="p-3 bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-xs text-[#0A0A0A] dark:text-[#FAFAFA]">{m.student_name}</p>
                      <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3]">{m.student_email}</p>
                    </div>
                    <span className="text-[10px] text-[#737373] dark:text-[#A3A3A3]">
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-[#737373]">
                  No students have joined this class yet. Share code <span className="font-mono font-bold text-[#0A0A0A] dark:text-[#FAFAFA]">{selectedClassForMembers.code}</span> with your students.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#262626] flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedClassForMembers(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Material Modal */}
      {selectedClassForUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <button
              onClick={() => setSelectedClassForUpload(null)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center">
                <BookOpen className="w-4 h-4 mr-2" /> Class Materials
              </h2>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
                Manage materials for <span className="font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">{selectedClassForUpload.name}</span>.
              </p>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {isLoadingMaterials ? (
                <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0A0A0A] dark:text-[#FAFAFA]" /></div>
              ) : classMaterials.length > 0 ? (
                classMaterials.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-lg">
                    <div className="truncate pr-4 flex-1">
                      <p className="text-xs font-medium text-[#0A0A0A] dark:text-[#FAFAFA] truncate">{m.file_name}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="px-2 h-7" 
                      onClick={() => handleDeleteMaterial(m.id)}
                      disabled={isDeletingMaterial === m.id}
                    >
                      {isDeletingMaterial === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-[#737373]">No materials uploaded yet.</div>
              )}
            </div>

            {uploadError && (
              <div className="p-3 bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] text-xs text-[#0A0A0A] dark:text-[#FAFAFA] rounded-md">
                {uploadError}
              </div>
            )}

            {uploadSuccess ? (
              <div className="p-4 bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-center">
                <Check className="w-6 h-6 mx-auto mb-1 text-[#0A0A0A] dark:text-[#FAFAFA]" />
                <p className="font-semibold text-xs text-[#0A0A0A] dark:text-[#FAFAFA]">Material Uploaded Successfully</p>
                <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] mt-1">The document is now available to students and indexed for Ask AI.</p>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-3">
                <div className="p-5 border border-dashed border-[#E5E5E5] dark:border-[#333333] rounded-lg bg-[#FAFAFA] dark:bg-[#111111] text-center relative hover:border-[#0A0A0A] dark:hover:border-[#FAFAFA] transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <FileIcon className="w-6 h-6 text-[#737373] mx-auto mb-2" />
                  {uploadFile ? (
                    <p className="text-xs font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">{uploadFile.name}</p>
                  ) : (
                    <>
                      <p className="text-xs text-[#0A0A0A] dark:text-[#FAFAFA] font-medium">Click to select or drag and drop</p>
                      <p className="text-[10px] text-[#737373] dark:text-[#A3A3A3] mt-0.5">PDF, DOCX, TXT, MD (Max 10MB)</p>
                    </>
                  )}
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                  <Button type="button" variant="outline" className="w-full" onClick={() => setSelectedClassForUpload(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full" disabled={isUploading || !uploadFile}>
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Upload File
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl relative text-center">
            <div className="mx-auto w-10 h-10 bg-[#F5F5F5] dark:bg-[#262626] rounded-full flex items-center justify-center border border-[#E5E5E5] dark:border-[#333333] mb-1">
              <AlertCircle className="w-5 h-5 text-[#0A0A0A] dark:text-[#FAFAFA]" />
            </div>
            
            <div>
              <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#FAFAFA]">Delete Classroom?</h2>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1.5">
                Are you sure you want to delete <span className="font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">{classToDelete.name}</span>? 
                This will permanently remove the class and enrolled students.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] text-xs text-[#0A0A0A] dark:text-[#FAFAFA] rounded-md">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2.5 pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
              <Button type="button" variant="outline" className="w-full" onClick={() => setClassToDelete(null)}>
                Cancel
              </Button>
              <Button 
                className="w-full" 
                onClick={handleDeleteClass}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete Class
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
