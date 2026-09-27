import { apiClient } from './client';
import { Material } from './materials';
import { LearningPlan } from './learningPlans';

export interface ClassCreatePayload {
  name: string;
  college?: string;
  year?: string;
  semester?: string;
  regulation?: string;
  section?: string;
}

export interface ClassJoinPayload {
  code: string;
}

export interface ClassMember {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  joined_at: string;
}

export interface Classroom {
  id: number;
  teacher_id: number;
  teacher_name?: string;
  teacher_email?: string;
  name: string;
  code: string;
  college?: string;
  year?: string;
  semester?: string;
  regulation?: string;
  section?: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
}

export interface ClassroomProgress {
  class_id: number;
  overall_progress_percent: number;
  total_tasks: number;
  completed_tasks: number;
  plans_completed: number;
  total_plans: number;
  skills_assessed: number;
  average_skill_score: number;
  topics_completed_count: number;
  assessments_completed_count: number;
}

export interface ClassroomOverview {
  classroom: Classroom;
  materials_count: number;
  enrolled_count: number;
  active_plan?: any;
  progress: ClassroomProgress;
  required_skills: string[];
  student_skills: Array<{ id: number; skill_category: string; score: number; last_updated?: string }>;
  recent_materials: Array<{ id: number; file_name: string; chunk_count: number; created_at?: string }>;
}

export interface ClassroomTopic {
  id: number;
  name: string;
  description?: string;
  objectives?: string[];
}

export interface ClassroomUnit {
  id: number;
  name: string;
  description?: string;
  order_index?: number;
  topics: ClassroomTopic[];
}

export interface ClassroomCurriculum {
  class_id: number;
  subject_name: string;
  units: ClassroomUnit[];
}

export interface ClassroomSkills {
  class_id: number;
  subject: string;
  required_skills: string[];
  skills: Array<{ id: number; skill_category: string; score: number; last_updated?: string }>;
  history: Array<{ id: number; skill_category: string; score: number; recorded_at?: string }>;
}

export interface ClassroomAskAISource {
  file_name: string;
  page_number?: number;
  content_snippet: string;
}

export interface ClassroomAskAIResponse {
  answer: string;
  sources: ClassroomAskAISource[];
  rag_grounded: boolean;
  retrieved_chunks: number;
}

export const classroomApi = {
  createClass: async (payload: ClassCreatePayload): Promise<Classroom> => {
    const response = await apiClient.post<Classroom>('/classes', payload);
    return response.data;
  },

  getTeacherClasses: async (): Promise<Classroom[]> => {
    const response = await apiClient.get<Classroom[]>('/classes/teacher');
    return response.data;
  },

  joinClass: async (payload: ClassJoinPayload): Promise<Classroom> => {
    const response = await apiClient.post<Classroom>('/classes/join', payload);
    return response.data;
  },

  getStudentClasses: async (): Promise<Classroom[]> => {
    const response = await apiClient.get<Classroom[]>('/classes/student');
    return response.data;
  },

  getClassDetails: async (classId: number): Promise<Classroom> => {
    const response = await apiClient.get<Classroom>(`/classes/${classId}`);
    return response.data;
  },

  getClassMembers: async (classId: number): Promise<ClassMember[]> => {
    const response = await apiClient.get<ClassMember[]>(`/classes/${classId}/members`);
    return response.data;
  },

  leaveClass: async (classId: number): Promise<void> => {
    await apiClient.delete(`/classes/${classId}/leave`);
  },

  getClassOverview: async (classId: number): Promise<ClassroomOverview> => {
    const response = await apiClient.get<ClassroomOverview>(`/classes/${classId}/overview`);
    return response.data;
  },

  getClassMaterials: async (classId: number, search?: string): Promise<Material[]> => {
    const params = search ? { search } : {};
    const response = await apiClient.get<Material[]>(`/classes/${classId}/materials`, { params });
    return response.data;
  },

  getClassSkills: async (classId: number): Promise<ClassroomSkills> => {
    const response = await apiClient.get<ClassroomSkills>(`/classes/${classId}/skills`);
    return response.data;
  },

  getClassCurriculum: async (classId: number): Promise<ClassroomCurriculum> => {
    const response = await apiClient.get<ClassroomCurriculum>(`/classes/${classId}/curriculum`);
    return response.data;
  },

  getClassLearningPlans: async (classId: number): Promise<LearningPlan[]> => {
    const response = await apiClient.get<LearningPlan[]>(`/classes/${classId}/learning-plans`);
    return response.data;
  },

  getClassProgress: async (classId: number): Promise<ClassroomProgress> => {
    const response = await apiClient.get<ClassroomProgress>(`/classes/${classId}/progress`);
    return response.data;
  },

  askClassroomAI: async (classId: number, question: string): Promise<ClassroomAskAIResponse> => {
    const response = await apiClient.post<ClassroomAskAIResponse>(`/classes/${classId}/ask-ai`, { question });
    return response.data;
  },

  deleteClass: async (classId: number): Promise<void> => {
    await apiClient.delete(`/classes/${classId}`);
  },
};
