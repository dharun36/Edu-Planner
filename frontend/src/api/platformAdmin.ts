import { apiClient } from './client';

export interface PlatformStats {
  total_colleges: number;
  active_colleges: number;
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_admins: number;
}

export interface College {
  id: number;
  name: string;
  code?: string;
  domain?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateCollegePayload {
  name: string;
  code: string;
  domain?: string;
  description?: string;
}

export interface UpdateCollegePayload {
  name?: string;
  domain?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateCollegeAdminPayload {
  email: string;
  full_name: string;
  password: string;
  college_id: number;
}

export interface CollegeAdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  college_id: number;
}

export const platformAdminApi = {
  getStats: async (): Promise<PlatformStats> => {
    const res = await apiClient.get<PlatformStats>('/platform-admin/stats');
    return res.data;
  },

  listColleges: async (): Promise<College[]> => {
    const res = await apiClient.get<College[]>('/platform-admin/colleges');
    return res.data;
  },

  createCollege: async (payload: CreateCollegePayload): Promise<College> => {
    const res = await apiClient.post<College>('/platform-admin/colleges', payload);
    return res.data;
  },

  updateCollege: async (collegeId: number, payload: UpdateCollegePayload): Promise<College> => {
    const res = await apiClient.patch<College>(`/platform-admin/colleges/${collegeId}`, payload);
    return res.data;
  },

  createCollegeAdmin: async (collegeId: number, payload: CreateCollegeAdminPayload): Promise<CollegeAdminUser> => {
    const res = await apiClient.post<CollegeAdminUser>(`/platform-admin/colleges/${collegeId}/admins`, payload);
    return res.data;
  },
};
