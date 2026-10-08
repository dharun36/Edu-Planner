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
        <Loader2 className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-[#171717] rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F5F5F5] dark:bg-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] text-[11px] font-semibold mb-2 border border-[#E5E5E5] dark:border-[#333333]">
            <Server className="w-3.5 h-3.5" />
            Super-Admin Console
          </div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
            Platform Master Console
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Global tenant overview, institution lifecycle management, and platform analytics.
          </p>
        </div>
        <div>
          <Link to="/platform-admin/colleges">
            <Button className="flex items-center gap-2 text-xs">
              <Plus className="w-4 h-4" />
              Onboard College Tenant
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">Total Institutions</span>
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] flex items-center justify-center text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333]">
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">{stats?.total_colleges ?? 0}</h3>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
                <span className="text-[#0A0A0A] dark:text-[#FAFAFA] font-medium">{stats?.active_colleges ?? 0}</span> active tenants
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">Total Users</span>
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] flex items-center justify-center text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">{stats?.total_users ?? 0}</h3>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">Across all colleges</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">Active Students</span>
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] flex items-center justify-center text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333]">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">{stats?.total_students ?? 0}</h3>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">Registered learners</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">Faculty & Staff</span>
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] dark:bg-[#262626] flex items-center justify-center text-[#0A0A0A] dark:text-[#FAFAFA] border border-[#E5E5E5] dark:border-[#333333]">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">{stats?.total_teachers ?? 0}</h3>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
                {stats?.total_admins ?? 0} Tenant Administrators
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Colleges Overview */}
      <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E5E5] dark:border-[#262626] px-5 py-4">
          <div>
            <CardTitle className="text-sm font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">Institutions & Tenants</CardTitle>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">Configured college environments</p>
          </div>
          <Link
            to="/platform-admin/colleges"
            className="text-xs text-[#0A0A0A] dark:text-[#FAFAFA] hover:underline flex items-center gap-1 font-medium"
          >
            Manage Colleges
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {colleges.length === 0 ? (
            <div className="p-8 text-center text-[#737373] text-xs">
              No institutions onboarded yet.
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
              {colleges.map((college) => (
                <div key={college.id} className="p-4 flex items-center justify-between hover:bg-[#F5F5F5]/60 dark:hover:bg-[#202020]/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#E5E5E5] dark:bg-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center justify-center font-bold text-xs">
                      {college.code || college.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">{college.name}</p>
                      <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] font-mono mt-0.5">
                        Code: {college.code} • Domain: {college.domain || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md font-medium ${
                        college.is_active
                          ? 'bg-[#0A0A0A] text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A]'
                          : 'text-[#737373] border border-[#E5E5E5] dark:border-[#262626]'
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
