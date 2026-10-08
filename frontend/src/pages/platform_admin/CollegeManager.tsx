import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Building,
  Plus,
  UserPlus,
  Loader2,
  X,
  ShieldAlert,
  Power,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import {
  platformAdminApi,
  College,
  CreateCollegePayload,
} from '../../api/platformAdmin';

export default function CollegeManager() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // College Creation Modal
  const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);
  const [collegeForm, setCollegeForm] = useState<CreateCollegePayload>({
    name: '',
    code: '',
    domain: '',
    description: '',
  });
  const [collegeError, setCollegeError] = useState('');
  const [isSubmittingCollege, setIsSubmittingCollege] = useState(false);

  // College Admin Creation Modal
  const [selectedCollegeForAdmin, setSelectedCollegeForAdmin] = useState<College | null>(null);
  const [adminForm, setAdminForm] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      setIsLoading(true);
      const data = await platformAdminApi.listColleges();
      setColleges(data);
    } catch (err) {
      console.error('Failed to load colleges:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCollege(true);
    setCollegeError('');

    try {
      const created = await platformAdminApi.createCollege({
        name: collegeForm.name.trim(),
        code: collegeForm.code.trim().toUpperCase(),
        domain: collegeForm.domain?.trim() || undefined,
        description: collegeForm.description?.trim() || undefined,
      });
      setColleges((prev) => [created, ...prev]);
      setIsCollegeModalOpen(false);
      setCollegeForm({ name: '', code: '', domain: '', description: '' });
    } catch (err: any) {
      setCollegeError(err.response?.data?.detail || 'Failed to create college.');
    } finally {
      setIsSubmittingCollege(false);
    }
  };

  const handleToggleCollegeActive = async (college: College) => {
    const updatedStatus = !college.is_active;
    try {
      const updated = await platformAdminApi.updateCollege(college.id, {
        is_active: updatedStatus,
      });
      setColleges((prev) => prev.map((c) => (c.id === college.id ? updated : c)));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update college status');
    }
  };

  const handleCreateCollegeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollegeForAdmin) return;
    setIsSubmittingAdmin(true);
    setAdminError('');
    setAdminSuccess('');

    try {
      const res = await platformAdminApi.createCollegeAdmin(selectedCollegeForAdmin.id, {
        college_id: selectedCollegeForAdmin.id,
        full_name: adminForm.full_name.trim(),
        email: adminForm.email.trim().toLowerCase(),
        password: adminForm.password,
      });
      setAdminSuccess(`College Admin account created successfully for ${res.email}`);
      setAdminForm({ full_name: '', email: '', password: '' });
    } catch (err: any) {
      setAdminError(err.response?.data?.detail || 'Failed to create college admin.');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center gap-2.5">
            <Building className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA]" />
            College Tenants
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Provision, manage, and assign institutional administrators to college tenants.
          </p>
        </div>
        <Button
          onClick={() => {
            setCollegeError('');
            setIsCollegeModalOpen(true);
          }}
          className="flex items-center gap-2 self-start sm:self-auto text-xs"
        >
          <Plus className="w-4 h-4" />
          Onboard College Tenant
        </Button>
      </div>

      {/* College List Card */}
      <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
        <CardHeader className="border-b border-[#E5E5E5] dark:border-[#262626] px-5 py-4">
          <CardTitle className="text-sm font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
            Institutions ({colleges.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA] animate-spin" />
            </div>
          ) : colleges.length === 0 ? (
            <div className="p-12 text-center text-[#737373] text-xs">
              No colleges onboarded yet. Click "Onboard College Tenant" above.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F5F5] dark:bg-[#202020] border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Institution Name</th>
                  <th className="px-5 py-3.5">Tenant Code</th>
                  <th className="px-5 py-3.5">Domain</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
                {colleges.map((college) => (
                  <tr key={college.id} className="hover:bg-[#F5F5F5]/60 dark:hover:bg-[#202020]/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-xs text-[#0A0A0A] dark:text-[#FAFAFA]">{college.name}</p>
                        {college.description && (
                          <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] mt-0.5 line-clamp-1">
                            {college.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-xs text-[#0A0A0A] dark:text-[#FAFAFA]">
                      {college.code}
                    </td>
                    <td className="px-5 py-3.5 text-[#737373] dark:text-[#A3A3A3] font-mono text-xs">
                      {college.domain || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-md font-medium ${
                          college.is_active
                            ? 'bg-[#0A0A0A] text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A]'
                            : 'text-[#737373] border border-[#E5E5E5] dark:border-[#262626]'
                        }`}
                      >
                        {college.is_active ? 'Active Tenant' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCollegeForAdmin(college);
                          setAdminError('');
                          setAdminSuccess('');
                          setAdminForm({ full_name: '', email: '', password: '' });
                        }}
                        className="text-xs h-7 px-2.5"
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Add Admin
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleCollegeActive(college)}
                        className="text-xs h-7 px-2.5"
                      >
                        <Power className="w-3 h-3 mr-1" />
                        {college.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Onboard College Modal */}
      {isCollegeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] rounded-xl w-full max-w-md p-6 relative shadow-xl">
            <button
              onClick={() => setIsCollegeModalOpen(false)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#FAFAFA] mb-1 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Onboard College Tenant
            </h2>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mb-5">
              Creates a dedicated tenant environment for the institution.
            </p>

            {collegeError && (
              <div className="mb-4 p-3 text-xs bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] rounded-md flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{collegeError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCollege} className="space-y-4">
              <Input
                label="College / University Name *"
                placeholder="e.g. Royal Institute of Technology"
                value={collegeForm.name}
                onChange={(e) => setCollegeForm({ ...collegeForm, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tenant Code *"
                  placeholder="e.g. RIT"
                  value={collegeForm.code}
                  onChange={(e) => setCollegeForm({ ...collegeForm, code: e.target.value.toUpperCase() })}
                  required
                />
                <Input
                  label="Official Domain"
                  placeholder="e.g. rit.edu"
                  value={collegeForm.domain || ''}
                  onChange={(e) => setCollegeForm({ ...collegeForm, domain: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">Description</label>
                <textarea
                  className="w-full bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-md px-3 py-2 text-xs text-[#0A0A0A] dark:text-[#FAFAFA] focus:outline-none focus:border-[#0A0A0A] dark:focus:border-[#FAFAFA]"
                  rows={3}
                  placeholder="Notes about the institution"
                  value={collegeForm.description || ''}
                  onChange={(e) => setCollegeForm({ ...collegeForm, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button type="button" variant="outline" onClick={() => setIsCollegeModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmittingCollege}
                >
                  Create College
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create College Admin Modal */}
      {selectedCollegeForAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] rounded-xl w-full max-w-md p-6 relative shadow-xl">
            <button
              onClick={() => setSelectedCollegeForAdmin(null)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#FAFAFA] mb-1 flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Assign College Admin
            </h2>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mb-5">
              Assign an institutional administrator for <strong>{selectedCollegeForAdmin.name}</strong>.
            </p>

            {adminError && (
              <div className="mb-4 p-3 text-xs bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] rounded-md flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{adminError}</span>
              </div>
            )}

            {adminSuccess && (
              <div className="mb-4 p-3 text-xs bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] rounded-md flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0A0A0A] dark:text-[#FAFAFA]" />
                <span>{adminSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateCollegeAdmin} className="space-y-4">
              <Input
                label="Administrator Full Name *"
                placeholder="Dr. Katherine Ward"
                value={adminForm.full_name}
                onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                required
              />

              <Input
                label="Administrator Email *"
                type="email"
                placeholder="admin@college.edu"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                required
              />

              <Input
                label="Password *"
                type="password"
                placeholder="Minimum 8 characters"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                required
                minLength={8}
              />

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedCollegeForAdmin(null)}
                >
                  Done
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmittingAdmin}
                >
                  Provision Admin Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
