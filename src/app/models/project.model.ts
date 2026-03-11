export interface Todo {
  text: string;
  done: boolean;
  children?: Todo[];
}

export interface WeeklySchedule {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface ProjectDocument {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type AIModel = 'claude-sonnet' | 'gpt-4o' | 'gemini-2.5-flash';

export interface AIModelOption {
  id: AIModel;
  name: string;
  available: boolean;
}

// Marketing Research
export interface Competitor {
  name: string;
  url: string;
  strengths: string[];
  weaknesses: string[];
  estimatedMrr: number;
  notes: string;
}

export interface MarketingChannel {
  name: string;
  strategy: string;
  budget: string;
  expectedRoi: string;
  priority: 'low' | 'medium' | 'high';
  status: 'planned' | 'in-progress' | 'completed';
}

export interface MarketingActionItem {
  task: string;
  channel: string;
  deadline: string;
  done: boolean;
}

export interface MarketingResearch {
  competitors: Competitor[];
  marketSize: { tam: string; sam: string; som: string; sources: string[]; analyzedAt?: string };
  trends: { title: string; description: string; relevance: 'low' | 'medium' | 'high'; source: string }[];
  benchmarks: { raw: string; analyzedAt?: string };
  marketingPlan: {
    summary: string;
    channels: MarketingChannel[];
    actionItems: MarketingActionItem[];
    raw: string;
    generatedAt?: string;
  };
  lastResearchAt?: string;
}

// Agent Sessions
export interface AgentStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentSession {
  sessionId: string;
  type: 'marketing-research' | 'claude-code' | 'skill';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  steps: AgentStep[];
  createdAt: string;
  completedAt?: string;
}

// Claude Code Events
export interface ClaudeCodeEvent {
  type: 'start' | 'text' | 'tool_use' | 'tool_result' | 'error' | 'done';
  content?: string;
  tool?: string;
  sessionId: string;
}

// Skills
export interface Skill {
  _id?: string;
  projectId?: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
  category: 'development' | 'marketing' | 'analysis' | 'operations' | 'custom';
  executionMode: 'ai-chat' | 'claude-code';
  isBuiltIn: boolean;
}

export interface Project {
  _id?: string;
  userId?: string;
  name: string;
  description: string;
  backgroundImage: string;
  githubRepos: string[];
  localPath: string;
  mrr: number;
  clientCount: number;
  impact: 'low' | 'medium' | 'high';
  niche: string;
  timeConsumption: number;
  todos: Todo[];
  presentation: string;
  monetizationPlan: string;
  schedule: WeeklySchedule;
  documents: ProjectDocument[];
  marketingResearch: MarketingResearch;
  agentSessions: AgentSession[];
  sortOrder?: number;
  burndownSortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}
