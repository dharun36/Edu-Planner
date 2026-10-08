import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  Building,
  Users,
  GraduationCap,
  ShieldCheck,
  Plus,
  Loader2,
  ArrowRight,
  Server,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  platformAdminApi,
  PlatformStats,
  College,
} from '../../api/platformAdmin';
import { useAuth } from '../../components/auth/AuthProvider';

export default function PlatformAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const fetchPlatformData = async () => {
    try {
      setIsLoading(true);
      const [statsData, collegesData] = await Promise.all([
        platformAdminApi.getStats(),
        platformAdminApi.listColleges(),
      ]);
      setStats(statsData);
      setColleges(collegesData);
    } catch (err) {
      console.error('Failed to load platform data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-neutral-500/10 via-surface to-surface p-6 rounded-2xl border border-neutral-500/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-500/20 text-neutral-400 text-xs font-semibold mb-3 border border-neutral-500/30">
            <Server className="w-3.5 h-3.5" />
            Super-Admin SaaS Console
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Platform Master Console
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Global tenant overview, institution lifecycle management, and platform analytics.
          </p>
        </div>
        <div>
          <Link to="/platform-admin/colleges">
            <Button className="flex items-center gap-2 bg-neutral-500 hover:bg-neutral-400 text-black font-semibold">
              <Plus className="w-4 h-4" />
              Onboard College Tenant
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-white/5 bg-surface/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Total Institutions</span>
              <div className="w-10 h-10 rounded-xl bg-neutral-500/10 flex items-center justify-center text-neutral-400 border border-neutral-500/20">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-white">{stats?.total_colleges ?? 0}</h3>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <span className="text-neutral-400 font-semibold">{stats?.active_colleges ?? 0}</span> active tenants
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-surface/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Total Users</span>
              <div className="w-10 h-10 rounded-xl bg-neutral-500/10 flex items-center justify-center text-neutral-400 border border-neutral-500/20">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-white">{stats?.total_users ?? 0}</h3>
              <p className="text-xs text-gray-400 mt-1">Across all colleges</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-surface/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Active Students</span>
              <div className="w-10 h-10 rounded-xl bg-neutral-500/10 flex items-center justify-center text-neutral-400 border border-neutral-500/20">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-white">{stats?.total_students ?? 0}</h3>
              <p className="text-xs text-gray-400 mt-1">Registered learners</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-surface/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Faculty & Staff</span>
              <div className="w-10 h-10 rounded-xl bg-neutral-500/10 flex items-center justify-center text-neutral-400 border border-neutral-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-white">{stats?.total_teachers ?? 0}</h3>
              <p className="text-xs text-gray-400 mt-1">
                {stats?.total_admins ?? 0} Tenant Administrators
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Colleges Overview */}
      <Card className="border-white/5 bg-surface/60">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold text-white">Institutions & Tenants</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Configured college environments</p>
          </div>
          <Link
            to="/platform-admin/colleges"
            className="text-xs text-neutral-400 hover:text-neutral-300 flex items-center gap-1 font-medium"
          >
            Manage Colleges
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {colleges.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No institutions onboarded yet.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {colleges.map((college) => (
                <div key={college.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-500/10 border border-neutral-500/20 flex items-center justify-center text-neutral-400 font-bold text-sm">
                      {college.code || college.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{college.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        Code: {college.code} • Domain: {college.domain || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                        college.is_active
                          ? 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                          : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {college.is_active ? 'Active Tenant' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
