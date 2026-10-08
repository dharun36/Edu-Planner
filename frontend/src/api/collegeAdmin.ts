import { apiClient } from './client';

export interface CollegeStats {
  total_students: number;
  registered_students: number;
  total_teachers: number;
  total_departments: number;
  total_programs: number;
  students_needing_attention: number;
}

export interface Department {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  college_id?: number;
}

export interface CreateDepartmentPayload {
  name: string;
  code?: string;
  description?: string;
}

export interface Program {
  id: number;
  department_id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
}

export interface CreateProgramPayload {
  department_id: number;
  name: string;
  code?: string;
  description?: string;
}

export interface StudentRegistryRecord {
  id: number;
  college_id: number;
  student_identifier: string;
  official_email: string;
  full_name: string;
  department_id?: number;
  program_id?: number;
  batch_year?: string;
  current_semester?: string;
  status: 'active' | 'registered' | 'inactive';
  registered_user_id?: number;
  created_at: string;
}

export interface AddStudentRegistryPayload {
  student_identifier: string;
  official_email: string;
  full_name: string;
  department_id?: number;
  batch_year?: string;
  current_semester?: string;
}

export interface TeacherRecord {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
}

export interface TeacherInvitePayload {
  email: string;
  department_id?: number;
}

export interface TeacherInviteResult {
  message: string;
  invitation_token: string;
  email: string;
  expires_at: string;
}

export const collegeAdminApi = {
  getStats: async (): Promise<CollegeStats> => {
    const res = await apiClient.get<CollegeStats>('/college-admin/stats');
    return res.data;
  },

  listDepartments: async (): Promise<Department[]> => {
    const res = await apiClient.get<Department[]>('/college-admin/departments');
    return res.data;
  },

  createDepartment: async (payload: CreateDepartmentPayload): Promise<Department> => {
    const res = await apiClient.post<Department>('/college-admin/departments', payload);
    return res.data;
  },

  listPrograms: async (): Promise<Program[]> => {
    const res = await apiClient.get<Program[]>('/college-admin/programs');
    return res.data;
  },

  createProgram: async (payload: CreateProgramPayload): Promise<Program> => {
    const res = await apiClient.post<Program>('/college-admin/programs', payload);
    return res.data;
  },

  listStudents: async (): Promise<StudentRegistryRecord[]> => {
    const res = await apiClient.get<StudentRegistryRecord[]>('/college-admin/students');
    return res.data;
  },

  addStudentToRegistry: async (payload: AddStudentRegistryPayload): Promise<StudentRegistryRecord> => {
    const res = await apiClient.post<StudentRegistryRecord>('/college-admin/students', payload);
    return res.data;
  },

  updateStudentStatus: async (registryId: number, status: 'active' | 'inactive'): Promise<{ message: string }> => {
    const res = await apiClient.patch<{ message: string }>(`/college-admin/students/${registryId}/status?status=${status}`);
    return res.data;
  },

  listTeachers: async (): Promise<TeacherRecord[]> => {
    const res = await apiClient.get<TeacherRecord[]>('/college-admin/teachers');
    return res.data;
  },

  inviteTeacher: async (payload: TeacherInvitePayload): Promise<TeacherInviteResult> => {
    const res = await apiClient.post<TeacherInviteResult>('/college-admin/teachers/invite', payload);
    return res.data;
  },

  updateTeacherStatus: async (teacherId: number, isActive: boolean): Promise<{ message: string }> => {
    const res = await apiClient.patch<{ message: string }>(`/college-admin/teachers/${teacherId}/status?is_active=${isActive}`);
    return res.data;
  },
};
