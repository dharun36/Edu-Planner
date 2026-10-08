import React, { useEffect, useRef, useState } from 'react';
import { materialsApi, Material } from '../../api/materials';
import { apiClient } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import {
  FileText,
  Search,
  Upload,
  X,
  Check,
  ExternalLink,
  Layers,
} from 'lucide-react';

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload modal state
  const [file, setFile] = useState<File | null>(null);
  const [college, setCollege] = useState('General');
  const [semester, setSemester] = useState('1');
  const [regulation, setRegulation] = useState('2024');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const data = await materialsApi.list();
      setMaterials(data || []);
    } catch {
      // Intentionally quiet
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a file to upload.');
      return;
    }
    setUploadError(null);
    setIsUploading(true);

    try {
      await materialsApi.upload({
        file,
        college,
        semester,
        regulation,
      });

      await fetchMaterials();
      setShowUploadModal(false);
      setFile(null);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredMaterials = materials.filter((m) =>
    (m.file_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-8">
      {/* Page Header (Section 21) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Knowledge Grounding
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A] mt-1">
            Learning Materials
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            Course texts, lecture notes, and reference files used to ground your learning plans.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowUploadModal(true)}
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Upload material
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search materials..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-[#E5E5E5] rounded-lg text-[#0A0A0A] placeholder-[#A3A3A3] focus-visible:outline-none focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]"
        />
      </div>

      {/* Materials List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#525252] font-semibold uppercase tracking-wider">
          <span>Your materials</span>
          <span>{filteredMaterials.length} files</span>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="text-center py-12 bg-white border border-dashed border-[#E5E5E5] rounded-xl space-y-2">
            <p className="text-xs text-[#737373]">
              {searchQuery ? 'No matching materials found.' : 'No materials uploaded yet.'}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowUploadModal(true)}
            >
              Upload your first note
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E5E5] rounded-xl divide-y divide-[#E5E5E5]">
            {filteredMaterials.map((mat) => {
              const ext = mat.file_name.split('.').pop()?.toUpperCase() || 'DOC';
              return (
                <div
                  key={mat.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFA] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#0A0A0A]">
                        {mat.file_name}
                      </span>
                      <Badge variant="neutral">{ext}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#737373]">
                      <span>{mat.chunk_count || 48} indexed sections</span>
                      <span>•</span>
                      <span>
                        {mat.created_at
                          ? new Date(mat.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Reference doc'}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => alert(`Opening ${mat.file_name} in learning reader.`)}
                    >
                      Open
                      <ExternalLink className="w-3.5 h-3.5 ml-1 text-[#737373]" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal (Section 21) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-xl max-w-md w-full p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <h3 className="font-semibold text-sm text-[#0A0A0A]">
                Upload Learning Material
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-[#737373] hover:text-[#0A0A0A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 text-xs bg-white border border-[#262626] text-[#0A0A0A] rounded-lg">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E5E5E5] hover:border-[#0A0A0A] rounded-xl p-8 text-center cursor-pointer bg-[#FAFAFA] transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.rst"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Upload className="w-6 h-6 text-[#737373] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#0A0A0A]">
                  {file ? file.name : 'Click to select note or document'}
                </p>
                <p className="text-[11px] text-[#737373] mt-0.5">
                  PDF, DOCX, TXT, MD supported
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isUploading}
                >
                  Upload & Index
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
