import { apiClient } from './client';

export interface MaterialChunk {
  id: number;
  chunk_index: number;
  content: string;
  page_number?: number;
}

export interface Material {
  id: number;
  file_name: string;
  college: string;
  semester: string;
  regulation: string;
  mime_type?: string | null;
  chunk_count: number;
  created_at: string;
}

export interface MaterialDetail extends Material {
  chunks: MaterialChunk[];
}

export interface SearchMaterialsRequest {
  query: string;
  college: string;
  semester: string;
  regulation: string;
  limit?: number;
}

export const materialsApi = {
  getDetail: async (id: number): Promise<MaterialDetail> => {
    const response = await apiClient.get<MaterialDetail>(`/materials/${id}`);
    return response.data;
  },

  list: async (
    filters?: { college?: string; subject?: string; semester?: string; regulation?: string } | string,
    subject?: string
  ): Promise<Material[]> => {
    const params = new URLSearchParams();
    if (typeof filters === 'string') {
      if (filters) params.append('college', filters);
      if (subject) params.append('subject', subject);
    } else if (filters) {
      if (filters.college) params.append('college', filters.college);
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.regulation) params.append('regulation', filters.regulation);
    }
    
    const response = await apiClient.get<Material[]>('/materials', { params });
    return response.data;
  },

  search: async (request: SearchMaterialsRequest): Promise<any> => {
    const response = await apiClient.post('/materials/search', request);
    return response.data;
  },

  upload: async (payload: { file: File; college?: string; subject?: string; semester?: string; regulation?: string }): Promise<Material> => {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.subject) formData.append('subject', payload.subject);
    formData.append('college', payload.college || 'Personal');
    formData.append('semester', payload.semester || '1');
    formData.append('regulation', payload.regulation || 'General');
    
    const response = await apiClient.post<Material>('/materials', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/materials/${id}`);
  }
};
