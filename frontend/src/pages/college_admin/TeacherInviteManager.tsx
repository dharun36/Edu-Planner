import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Users,
  MailPlus,
  Copy,
  Check,
  ShieldAlert,
  Loader2,
  UserCheck,
  UserX,
  X,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import {
  collegeAdminApi,
  TeacherRecord,
  Department,
  TeacherInviteResult,
} from '../../api/collegeAdmin';

export default function TeacherInviteManager() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invite Modal & Form
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined);
  const [inviteResult, setInviteResult] = useState<TeacherInviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [teachersData, deptsData] = await Promise.all([
        collegeAdminApi.listTeachers(),
        collegeAdminApi.listDepartments(),
      ]);
      setTeachers(teachersData);
      setDepartments(deptsData);
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError('');
    setInviteResult(null);

    try {
      const res = await collegeAdminApi.inviteTeacher({
        email: inviteEmail.trim().toLowerCase(),
        department_id: selectedDeptId,
      });
      setInviteResult(res);
      setInviteEmail('');
      setSelectedDeptId(undefined);
    } catch (err: any) {
      setInviteError(err.response?.data?.detail || 'Failed to generate invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyToken = () => {
    if (!inviteResult) return;
    const registrationUrl = `${window.location.origin}/register?tab=teacher&token=${inviteResult.invitation_token}`;
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleStatus = async (teacher: TeacherRecord) => {
    const updatedStatus = !teacher.is_active;
    try {
      await collegeAdminApi.updateTeacherStatus(teacher.id, updatedStatus);
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? { ...t, is_active: updatedStatus } : t))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update teacher status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-neutral-400" />
            Faculty & Educator Management
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Authorize faculty members via cryptographically secure invitation links.
          </p>
        </div>
        <Button
          onClick={() => {
            setInviteResult(null);
            setInviteError('');
            setIsInviteModalOpen(true);
          }}
          className="flex items-center gap-2 bg-neutral-600 hover:bg-neutral-500"
        >
          <MailPlus className="w-4 h-4" />
          Invite Faculty Member
        </Button>
      </div>

      {/* Teachers List */}
      <Card className="border-white/5 bg-surface/60">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-lg font-semibold text-white">
            Active Faculty Roster ({teachers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              No faculty members registered yet. Send an invitation to get started.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-light/50 border-b border-white/5 text-gray-400 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Instructor Name</th>
                  <th className="px-6 py-4">Institutional Email</th>
                  <th className="px-6 py-4">Account Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neutral-500/10 border border-neutral-500/20 flex items-center justify-center text-neutral-400 font-semibold text-sm">
                          {teacher.full_name.charAt(0)}
                        </div>
                        <span className="font-medium text-white">{teacher.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">{teacher.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${
                          teacher.is_active
                            ? 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                            : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                        }`}
                      >
                        {teacher.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(teacher)}
                        className={`text-xs ${
                          teacher.is_active
                            ? 'text-neutral-400 hover:text-neutral-300'
                            : 'text-neutral-400 hover:text-neutral-300'
                        }`}
                      >
                        {teacher.is_active ? (
                          <>
                            <UserX className="w-3.5 h-3.5 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => {
                setIsInviteModalOpen(false);
                fetchData();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-neutral-400" />
              Invite Faculty Member
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Generates a single-use token valid for 7 days.
            </p>

            {inviteError && (
              <div className="mb-4 p-3 text-xs bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-500/10 border border-neutral-500/20 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-neutral-400">
                    Invitation Generated Successfully!
                  </p>
                  <p className="text-xs text-gray-300">
                    Share the invitation link below with <strong>{inviteResult.email}</strong>:
                  </p>
                  <div className="bg-surface-light p-2.5 rounded-lg border border-white/10 text-xs font-mono text-gray-300 break-all select-all">
                    {window.location.origin}/register?tab=teacher&token={inviteResult.invitation_token}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleCopyToken}
                    className="w-full flex items-center justify-center gap-2 bg-neutral-600 hover:bg-neutral-500"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-neutral-400" />
                        Copied Link!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Invitation Link
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setInviteResult(null);
                    }}
                  >
                    Invite Another Faculty
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <Input
                  label="Faculty Email Address *"
                  type="email"
                  placeholder="professor@college.edu"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">
                    Assign Department (Optional)
                  </label>
                  <select
                    className="w-full bg-surface-light border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500/50"
                    value={selectedDeptId || ''}
                    onChange={(e) =>
                      setSelectedDeptId(e.target.value ? Number(e.target.value) : undefined)
                    }
                  >
                    <option value="">No specific department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsInviteModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-neutral-600 hover:bg-neutral-500"
                    isLoading={isInviting}
                  >
                    Generate Invitation
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
