import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Building,
  Plus,
  ShieldCheck,
  UserPlus,
  Loader2,
  X,
  CheckCircle2,
  ShieldAlert,
  Power,
  KeyRound,
} from 'lucide-react';
import {
  platformAdminApi,
  College,
  CreateCollegePayload,
  CreateCollegeAdminPayload,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Building className="w-7 h-7 text-neutral-400" />
            College Tenants
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Provision, manage, and assign institutional administrators to college tenants.
          </p>
        </div>
        <Button
          onClick={() => {
            setCollegeError('');
            setIsCollegeModalOpen(true);
          }}
          className="flex items-center gap-2 bg-neutral-500 hover:bg-neutral-400 text-black font-semibold"
        >
          <Plus className="w-4 h-4" />
          Onboard College Tenant
        </Button>
      </div>

      {/* College List Card */}
      <Card className="border-white/5 bg-surface/60">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-lg font-semibold text-white">
            Institutions ({colleges.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
            </div>
          ) : colleges.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              No colleges onboarded yet. Click "Onboard College Tenant" above.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-light/50 border-b border-white/5 text-gray-400 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Institution Name</th>
                  <th className="px-6 py-4">Tenant Code</th>
                  <th className="px-6 py-4">Domain</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {colleges.map((college) => (
                  <tr key={college.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-white">{college.name}</p>
                        {college.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {college.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-neutral-400">
                      {college.code}
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">
                      {college.domain || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${
                          college.is_active
                            ? 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                            : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                        }`}
                      >
                        {college.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedCollegeForAdmin(college);
                          setAdminError('');
                          setAdminSuccess('');
                          setAdminForm({ full_name: '', email: '', password: '' });
                        }}
                        className="text-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1 text-neutral-400" />
                        Add Admin
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleCollegeActive(college)}
                        className={`text-xs ${
                          college.is_active ? 'text-neutral-400 hover:text-neutral-300' : 'text-neutral-400 hover:text-neutral-300'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5 mr-1" />
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setIsCollegeModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Building className="w-5 h-5 text-neutral-400" />
              Onboard College Tenant
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Creates a dedicated tenant environment for the institution.
            </p>

            {collegeError && (
              <div className="mb-4 p-3 text-xs bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 rounded-xl flex items-center gap-2">
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
                <label className="text-sm font-medium text-gray-300">Description</label>
                <textarea
                  className="w-full bg-surface-light border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-neutral-500/50"
                  rows={3}
                  placeholder="Notes about the institution"
                  value={collegeForm.description || ''}
                  onChange={(e) => setCollegeForm({ ...collegeForm, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="ghost" onClick={() => setIsCollegeModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-neutral-500 hover:bg-neutral-400 text-black font-semibold"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedCollegeForAdmin(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-neutral-400" />
              Assign College Admin
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Assign an institutional administrator for <strong>{selectedCollegeForAdmin.name}</strong>.
            </p>

            {adminError && (
              <div className="mb-4 p-3 text-xs bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{adminError}</span>
              </div>
            )}

            {adminSuccess && (
              <div className="mb-4 p-3 text-xs bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
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

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedCollegeForAdmin(null)}
                >
                  Done
                </Button>
                <Button
                  type="submit"
                  className="bg-neutral-500 hover:bg-neutral-400 text-black font-semibold"
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
