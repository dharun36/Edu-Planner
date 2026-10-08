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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA]" />
            Faculty & Educator Management
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Authorize faculty members via cryptographically secure invitation links.
          </p>
        </div>
        <Button
          onClick={() => {
            setInviteResult(null);
            setInviteError('');
            setIsInviteModalOpen(true);
          }}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <MailPlus className="w-4 h-4" />
          Invite Faculty Member
        </Button>
      </div>

      {/* Teachers List */}
      <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
        <CardHeader className="border-b border-[#E5E5E5] dark:border-[#262626] px-5 py-4">
          <CardTitle className="text-sm font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
            Active Faculty Roster ({teachers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA] animate-spin" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="p-12 text-center text-[#737373] text-xs">
              No faculty members registered yet. Send an invitation to get started.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F5F5] dark:bg-[#202020] border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Instructor Name</th>
                  <th className="px-5 py-3.5">Institutional Email</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-[#F5F5F5]/60 dark:hover:bg-[#202020]/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E5E5E5] dark:bg-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center justify-center font-semibold text-xs">
                          {teacher.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">{teacher.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#737373] dark:text-[#A3A3A3] font-mono text-xs">{teacher.email}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-md font-medium ${
                          teacher.is_active
                            ? 'bg-[#0A0A0A] text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A]'
                            : 'text-[#737373] border border-[#E5E5E5] dark:border-[#262626]'
                        }`}
                      >
                        {teacher.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(teacher)}
                        className="text-xs h-7 px-2.5"
                      >
                        {teacher.is_active ? (
                          <>
                            <UserX className="w-3 h-3 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" />
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] rounded-xl w-full max-w-md p-6 relative shadow-xl">
            <button
              onClick={() => {
                setIsInviteModalOpen(false);
                fetchData();
              }}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#FAFAFA] mb-1 flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Invite Faculty Member
            </h2>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mb-5">
              Generates a single-use token valid for 7 days.
            </p>

            {inviteError && (
              <div className="mb-4 p-3 text-xs bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] rounded-md flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
                    Invitation Generated Successfully
                  </p>
                  <p className="text-xs text-[#737373] dark:text-[#A3A3A3]">
                    Share the invitation link below with <strong>{inviteResult.email}</strong>:
                  </p>
                  <div className="bg-white dark:bg-[#111111] p-2.5 rounded-md border border-[#E5E5E5] dark:border-[#262626] text-xs font-mono text-[#0A0A0A] dark:text-[#FAFAFA] break-all select-all">
                    {window.location.origin}/register?tab=teacher&token={inviteResult.invitation_token}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleCopyToken}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
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
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">
                    Assign Department (Optional)
                  </label>
                  <select
                    className="w-full bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-md px-3 py-2 text-xs text-[#0A0A0A] dark:text-[#FAFAFA] focus:outline-none focus:border-[#0A0A0A] dark:focus:border-[#FAFAFA]"
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

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E5E5] dark:border-[#262626]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInviteModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
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
