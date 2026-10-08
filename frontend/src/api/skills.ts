import { apiClient } from './client';

export interface SkillScore {
  id?: number;
  skill_category: string;
  score: number;
  last_updated?: string;
}

export interface SkillScores {
  numerical_calculation: number;
  abstract_thinking: number;
  logical_reasoning: number;
  association_analogy: number;
  spatial_imagination: number;
}

export const skillsApi = {
  getRawSkills: async (): Promise<SkillScore[]> => {
    const response = await apiClient.get<SkillScore[]>('/assessment/skills');
    return response.data;
  },

  getSkills: async (): Promise<SkillScores> => {
    const response = await apiClient.get<Array<{ skill_category: string; score: number }>>('/assessment/skills');
    const scores: SkillScores = {
      numerical_calculation: 0,
      abstract_thinking: 0,
      logical_reasoning: 0,
      association_analogy: 0,
      spatial_imagination: 0,
    };

    for (const skill of response.data) {
      const category = skill.skill_category.toLowerCase();
      if (category === 'numerical calculation') scores.numerical_calculation = skill.score;
      if (category === 'abstract thinking') scores.abstract_thinking = skill.score;
      if (category === 'logical reasoning') scores.logical_reasoning = skill.score;
      if (category === 'association/analogy') scores.association_analogy = skill.score;
      if (category === 'spatial imagination') scores.spatial_imagination = skill.score;
    }

    return scores;
  },
};
