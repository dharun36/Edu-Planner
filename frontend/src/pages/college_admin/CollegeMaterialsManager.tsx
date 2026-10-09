import React, { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import {
  BookOpen,
  Upload,
  Search,
  FileText,
  Trash2,
  Eye,
  Loader2,
  X,
  Sparkles,
  Database,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { materialsApi, Material, MaterialDetail } from '../../api/materials';
import { collegeAdminApi, Department } from '../../api/collegeAdmin';
import { useAuth } from '../../components/auth/AuthProvider';

export default function CollegeMaterialsManager() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedRegulation, setSelectedRegulation] = useState<string>('all');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('1');
  const [regulation, setRegulation] = useState('R2021');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail / Chunks modal state
  const [detailModalItem, setDetailModalItem] = useState<MaterialDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedSemester, selectedRegulation]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [materialsData, deptsData] = await Promise.all([
        materialsApi.list({
          college: user?.college || undefined,
          semester: selectedSemester !== 'all' ? selectedSemester : undefined,
          regulation: selectedRegulation !== 'all' ? selectedRegulation : undefined,
        }),
        collegeAdminApi.listDepartments(),
      ]);
      setMaterials(materialsData || []);
      setDepartments(deptsData || []);
    } catch (err) {
      console.error('Failed to load college materials data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'txt', 'md'].includes(ext || '')) {
        setUploadError('Only PDF, DOCX, TXT, or MD files are supported.');
        setUploadFile(null);
        return;
      }
      setUploadFile(selected);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    if (!subject.trim()) {
      setUploadError('Please enter the course/subject name.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      await materialsApi.upload({
        file: uploadFile,
        subject: subject.trim(),
        college: user?.college || 'College',
        semester: semester.trim(),
        regulation: regulation.trim(),
      });

      setUploadSuccess(`"${uploadFile.name}" indexed and embedded into the RAG vector store successfully!`);
      await loadData();
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setSubject('');
        setSemester('1');
        setRegulation('R2021');
        setUploadSuccess(null);
      }, 1200);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload and index document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? It will be removed from the RAG vector index.`)) {
      return;
    }
    try {
      await materialsApi.delete(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete material.');
    }
  };

  const handleViewChunks = async (id: number) => {
    setIsLoadingDetail(true);
    try {
      const detail = await materialsApi.getDetail(id);
      setDetailModalItem(detail);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to fetch material details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Filtered materials
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      (m.file_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.semester || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.regulation || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalChunks = materials.reduce((acc, m) => acc + (m.chunk_count || 0), 0);
  const uniqueRegulations = Array.from(new Set(materials.map((m) => m.regulation).filter(Boolean)));

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#737373]">
            <BookOpen className="w-3.5 h-3.5 text-[#0A0A0A]" />
            <span>Academic Knowledge Base</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] mt-1">
            Course & Curriculum Materials
          </h1>
          <p className="text-sm text-[#737373] mt-1 max-w-2xl">
            Upload institutional textbooks, syllabi, and unit notes. Materials are automatically parsed, chunked, and embedded into the ChromaDB RAG vector store to ground and personalize students' AI learning plans.
          </p>
        </div>

        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="shrink-0 flex items-center gap-2 bg-[#0A0A0A] text-white hover:bg-[#262626]"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Material</span>
        </Button>
      </div>

      {/* RAG Information Callout Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-blue-950 text-sm block">
              Active RAG Pipeline for Student Learning Plans
            </span>
            <span className="text-blue-800/80 leading-relaxed">
              When students in your college generate study paths, the multi-agent AI system (Analyst & Optimizer) directly retrieves matching curriculum chunks to build accurate syllabus-aligned tasks and assessments.
            </span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-lg border border-blue-200 text-blue-900 font-medium">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>Vector Search Active</span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-[#0A0A0A] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#737373] font-medium">Total Materials</p>
              <p className="text-xl font-bold text-[#0A0A0A] mt-0.5">{materials.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#737373] font-medium">RAG Chunks Indexed</p>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">{totalChunks}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#737373] font-medium">College</p>
              <p className="text-sm font-bold text-purple-900 truncate max-w-[130px] mt-0.5">
                {user?.college || 'Kongu Eng College'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#737373] font-medium">Formats Supported</p>
              <p className="text-sm font-bold text-amber-900 mt-0.5">PDF, DOCX, TXT</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-white border-[#E5E5E5]">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#A3A3A3]" />
            <input
              type="text"
              placeholder="Search materials by file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] bg-white text-[#0A0A0A]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 text-xs text-[#737373] shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-[#E5E5E5] rounded-lg bg-white text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            >
              <option value="all">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={String(s)}>
                  Semester {s}
                </option>
              ))}
            </select>

            <select
              value={selectedRegulation}
              onChange={(e) => setSelectedRegulation(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-[#E5E5E5] rounded-lg bg-white text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            >
              <option value="all">All Regulations</option>
              {uniqueRegulations.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              {!uniqueRegulations.includes('R2021') && <option value="R2021">R2021</option>}
              {!uniqueRegulations.includes('2024') && <option value="2024">2024</option>}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Materials List / Table */}
      <Card className="bg-white border-[#E5E5E5] overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-[#E5E5E5] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-[#0A0A0A]">
              Indexed Materials ({filteredMaterials.length})
            </CardTitle>
            <p className="text-xs text-[#737373] mt-0.5">
              Course documents currently loaded in the college RAG retrieval store.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#737373]">
              <Loader2 className="w-6 h-6 animate-spin text-[#0A0A0A]" />
              <p className="text-xs font-medium">Loading materials & vector status...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F5F5F5] text-[#737373] flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#0A0A0A]">No course materials found</h3>
              <p className="text-xs text-[#737373] max-w-sm mx-auto mt-1 leading-relaxed">
                {searchQuery || selectedSemester !== 'all' || selectedRegulation !== 'all'
                  ? 'No materials matched the specified filters. Try resetting search or filter criteria.'
                  : 'Start uploading syllabus documents, lecture notes, or textbooks to empower student AI lesson plans with institutional context.'}
              </p>
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-4 text-xs bg-[#0A0A0A] text-white hover:bg-[#262626]"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload First Material
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] font-medium">
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Scope & Academic Year</th>
                    <th className="py-3 px-4">RAG Indexing</th>
                    <th className="py-3 px-4">Uploaded</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {filteredMaterials.map((mat) => {
                    const ext = mat.file_name.split('.').pop()?.toUpperCase() || 'FILE';
                    return (
                      <tr key={mat.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-blue-100">
                              {ext}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[#0A0A0A] truncate max-w-xs sm:max-w-md">
                                {mat.file_name}
                              </p>
                              <p className="text-[11px] text-[#737373]">
                                College: {mat.college || 'Kongu Eng College'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#F5F5F5] text-[#525252] border border-[#E5E5E5]">
                              Semester {mat.semester || '1'}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {mat.regulation || 'General'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              {mat.chunk_count} Chunks
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[#737373] text-[11px]">
                          {mat.created_at ? new Date(mat.created_at).toLocaleDateString() : 'Recent'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewChunks(mat.id)}
                              className="p-1.5 rounded-md hover:bg-[#F5F5F5] text-[#525252] hover:text-[#0A0A0A] transition-colors"
                              title="Inspect RAG chunks"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(mat.id, mat.file_name)}
                              className="p-1.5 rounded-md hover:bg-red-50 text-[#737373] hover:text-red-600 transition-colors"
                              title="Delete material"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Material Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E5E5] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#0A0A0A]">
                  Upload Course Material
                </h3>
                <p className="text-xs text-[#737373] mt-0.5">
                  Feed syllabus documents & textbook chapters into the student RAG retriever.
                </p>
              </div>
              <button
                onClick={() => !isUploading && setIsUploadModalOpen(false)}
                className="p-1 rounded-md text-[#737373] hover:text-[#0A0A0A] hover:bg-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              {uploadError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-medium text-[#0A0A0A] mb-1.5">
                  Document File <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#D4D4D4] hover:border-[#0A0A0A] rounded-xl p-5 text-center cursor-pointer transition-colors bg-[#FAFAFA]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-[#E5E5E5] flex items-center justify-center mx-auto mb-2 text-[#0A0A0A]">
                    <Upload className="w-5 h-5" />
                  </div>
                  {uploadFile ? (
                    <div>
                      <p className="text-xs font-semibold text-[#0A0A0A]">{uploadFile.name}</p>
                      <p className="text-[11px] text-[#737373] mt-0.5">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-[#0A0A0A]">
                        Click to select document or drag & drop
                      </p>
                      <p className="text-[11px] text-[#737373] mt-1">
                        Supported: PDF, Word (DOCX), Text (TXT, MD)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject / Course Name */}
              <div>
                <label className="block text-xs font-medium text-[#0A0A0A] mb-1.5">
                  Subject / Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures and Algorithms"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
                <p className="text-[10px] text-[#737373] mt-1">
                  Students querying this subject will have their AI plan grounded with this material.
                </p>
              </div>

              {/* Semester & Regulation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#0A0A0A] mb-1.5">
                    Target Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-lg bg-white text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={String(s)}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#0A0A0A] mb-1.5">
                    Regulation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. R2021, 2024"
                    value={regulation}
                    onChange={(e) => setRegulation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  />
                </div>
              </div>

              {/* Department (Optional) */}
              {departments.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[#0A0A0A] mb-1.5">
                    Department (Optional)
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-lg bg-white text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  >
                    <option value="">All Departments / General</option>
                    {departments.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || !uploadFile || !subject.trim()}
                  className="text-xs bg-[#0A0A0A] text-white hover:bg-[#262626] flex items-center gap-1.5"
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? 'Chunking & Embedding...' : 'Upload & Index for RAG'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Chunks Detail Modal */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E5E5] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-[#E5E5E5] flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[#0A0A0A] truncate">
                    {detailModalItem.file_name}
                  </h3>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {detailModalItem.chunks?.length || 0} Chunks
                  </Badge>
                </div>
                <p className="text-xs text-[#737373] mt-0.5">
                  Semantic chunks stored in database and vectorized in ChromaDB.
                </p>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="p-1 rounded-md text-[#737373] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-[#FAFAFA]">
              {(!detailModalItem.chunks || detailModalItem.chunks.length === 0) ? (
                <div className="py-8 text-center text-xs text-[#737373]">
                  No chunk details available for this document.
                </div>
              ) : (
                detailModalItem.chunks.map((chunk, idx) => (
                  <div
                    key={chunk.id || idx}
                    className="p-3.5 rounded-lg bg-white border border-[#E5E5E5] text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#737373] mb-1.5 border-b border-[#F5F5F5] pb-1">
                      <span className="text-[#0A0A0A]">Chunk #{chunk.chunk_index + 1}</span>
                      {chunk.page_number && (
                        <span className="text-blue-600">Page {chunk.page_number}</span>
                      )}
                    </div>
                    <p className="text-[#262626] whitespace-pre-wrap leading-relaxed font-mono text-[11px] bg-[#FAFAFA] p-2.5 rounded border border-[#E5E5E5]/60">
                      {chunk.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-[#E5E5E5] flex justify-end shrink-0 bg-white">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalItem(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
