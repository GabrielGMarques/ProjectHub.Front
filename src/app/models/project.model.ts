export interface Project {
  _id?: string;
  userId?: string;
  name: string;
  description: string;
  backgroundImage: string;
  githubRepos: string[];
  mrr: number;
  clientCount: number;
  impact: 'low' | 'medium' | 'high';
  niche: string;
  timeConsumption: number;
  createdAt?: string;
  updatedAt?: string;
}
