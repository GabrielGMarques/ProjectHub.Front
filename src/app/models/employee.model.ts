export interface EmployeeTask {
  taskId: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  startedAt: string;
  completedAt?: string;
}

export interface EmployeeSkill {
  name: string;
  description: string;
  prompt: string;
}

export interface Employee {
  _id?: string;
  userId?: string;
  projectId: string;
  role: string;
  name: string;
  title: string;
  avatar: string;
  description: string;
  specialties: string[];
  skills: EmployeeSkill[];
  allowedTools: string[];
  systemPrompt: string;
  status: 'idle' | 'working' | 'paused';
  currentTask?: string;
  lastActivity?: string;
  taskHistory: EmployeeTask[];
  hiredAt: string;
}

export interface RoleTemplate {
  role: string;
  title: string;
  avatar: string;
  description: string;
  specialties: string[];
  defaultTools: string[];
  systemPrompt: string;
  department: string;
}

export interface CommFile {
  name: string;
  content: string;
  modified: string;
}
