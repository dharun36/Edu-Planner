export type UserRole = 'student' | 'teacher' | 'college_admin' | 'platform_admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  // Basic profile fields
  phone?: string | null;
  department?: string | null;
  year_of_study?: string | null;
  bio?: string | null;
  college?: string | null;
  college_id?: number | null;
  student_registry_id?: number | null;
  regulation?: string | null;
  semester?: string | null;
  // MVP: Persistent learning goal
  learning_subject?: string | null;
  learning_topic?: string | null;
  learning_goal?: string | null;
  onboarding_complete?: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone?: string;
  department?: string;
  year_of_study?: string;
  bio?: string;
  college?: string;
  regulation?: string;
  semester?: string;
  // MVP: Learning goal fields
  learning_subject?: string;
  learning_topic?: string;
  learning_goal?: string;
  onboarding_complete?: boolean;
}
