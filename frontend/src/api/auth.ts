import { apiClient } from './client';
import { User, UpdateProfileRequest } from '../types/auth';

export const authApi = {
  login: async (email: string, password: string): Promise<{ access_token: string; user: User }> => {
    const response = await apiClient.post<{ access_token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  registerStudent: async (
    collegeCode: string,
    studentIdentifier: string,
    officialEmail: string,
    fullName: string,
    password: string
  ): Promise<{ access_token: string; user: User }> => {
    const response = await apiClient.post<{ access_token: string; user: User }>('/auth/register/student', {
      college_code: collegeCode,
      student_identifier: studentIdentifier,
      official_email: officialEmail,
      full_name: fullName,
      password,
    });
    return response.data;
  },

  acceptTeacherInvitation: async (
    invitationToken: string,
    fullName: string,
    password: string
  ): Promise<{ access_token: string; user: User }> => {
    const response = await apiClient.post<{ access_token: string; user: User }>('/auth/invitations/accept', {
      invitation_token: invitationToken,
      full_name: fullName,
      password,
    });
    return response.data;
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /** Update the authenticated user's profile fields. */
  updateProfile: async (payload: UpdateProfileRequest): Promise<User> => {
    const response = await apiClient.patch<User>('/auth/profile', payload);
    return response.data;
  },
};
