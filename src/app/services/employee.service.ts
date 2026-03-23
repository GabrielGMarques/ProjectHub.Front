import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, EmployeeSkill, RoleTemplate, CommFile } from '../models/employee.model';
import { ClaudeCodeEvent } from '../models/project.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private apiUrl = `${environment.apiUrl}/employees`;

  constructor(private http: HttpClient, private zone: NgZone) {}

  getRoles(): Observable<RoleTemplate[]> {
    return this.http.get<RoleTemplate[]>(`${this.apiUrl}/roles`);
  }

  getAll(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/all`);
  }

  getByProject(projectId: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/project/${projectId}`);
  }

  getById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`);
  }

  hire(projectId: string, role: string, name?: string): Observable<Employee> {
    return this.http.post<Employee>(`${this.apiUrl}/hire`, { projectId, role, name });
  }

  fire(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  assignTask(employeeId: string, task: string): Observable<ClaudeCodeEvent> {
    return new Observable(observer => {
      const token = localStorage.getItem('token');
      const abortController = new AbortController();

      fetch(`${this.apiUrl}/${employeeId}/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ task }),
        signal: abortController.signal,
      }).then(async response => {
        if (!response.ok) {
          let errMsg = `HTTP ${response.status}`;
          try { const body = await response.json(); errMsg = body.error || errMsg; } catch { /* ignore */ }
          throw new Error(errMsg);
        }
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  this.zone.run(() => observer.next(data));
                } catch {}
              }
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          throw err;
        }
        this.zone.run(() => observer.complete());
      }).catch(err => {
        if (err.name === 'AbortError') {
          this.zone.run(() => observer.complete());
          return;
        }
        this.zone.run(() => observer.error(err));
      });

      return () => abortController.abort();
    });
  }

  stopTask(employeeId: string): Observable<{ stopped: boolean }> {
    return this.http.post<{ stopped: boolean }>(`${this.apiUrl}/${employeeId}/stop`, {});
  }

  sendMessage(employeeId: string, message: string): Observable<{ delivered: boolean; detail: string }> {
    return this.http.post<{ delivered: boolean; detail: string }>(`${this.apiUrl}/${employeeId}/message`, { message });
  }

  getComms(projectId: string): Observable<CommFile[]> {
    return this.http.get<CommFile[]>(`${this.apiUrl}/project/${projectId}/comms`);
  }

  addSkill(employeeId: string, skill: EmployeeSkill): Observable<Employee> {
    return this.http.post<Employee>(`${this.apiUrl}/${employeeId}/skills`, skill);
  }

  removeSkill(employeeId: string, skillName: string): Observable<Employee> {
    return this.http.delete<Employee>(`${this.apiUrl}/${employeeId}/skills/${encodeURIComponent(skillName)}`);
  }

  getRoleSkills(role: string): Observable<EmployeeSkill[]> {
    return this.http.get<EmployeeSkill[]>(`${this.apiUrl}/role-skills/${role}`);
  }

  setRoleSkills(role: string, skills: EmployeeSkill[]): Observable<{ updated: number }> {
    return this.http.put<{ updated: number }>(`${this.apiUrl}/role-skills/${role}`, { skills });
  }

  getLocalSkills(): Observable<{ name: string; description: string }[]> {
    return this.http.get<{ name: string; description: string }[]>(`${this.apiUrl}/local-skills`);
  }

  getLogs(employeeId: string, page = 1, limit = 100, category?: string): Observable<EmployeeLogsResponse> {
    let url = `${this.apiUrl}/${employeeId}/logs?page=${page}&limit=${limit}`;
    if (category) url += `&category=${category}`;
    return this.http.get<EmployeeLogsResponse>(url);
  }

  // Memory
  getMemories(employeeId: string, category?: string): Observable<EmployeeMemoryEntry[]> {
    let url = `${this.apiUrl}/${employeeId}/memories`;
    if (category) url += `?category=${category}`;
    return this.http.get<EmployeeMemoryEntry[]>(url);
  }

  addMemory(employeeId: string, data: { category: string; content: string; importance?: number; tags?: string[] }): Observable<EmployeeMemoryEntry> {
    return this.http.post<EmployeeMemoryEntry>(`${this.apiUrl}/${employeeId}/memories`, data);
  }

  deleteMemory(employeeId: string, memoryId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${employeeId}/memories/${memoryId}`);
  }

  wipeMemories(employeeId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${employeeId}/memories`);
  }

  compactLogs(employeeId: string): Observable<{ created: number; summary: string }> {
    return this.http.post<{ created: number; summary: string }>(`${this.apiUrl}/${employeeId}/compact`, {});
  }

  // Control
  restartEmployee(employeeId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${employeeId}/restart`, {});
  }

  clearSession(employeeId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${employeeId}/clear-session`, {});
  }

  getWorkingStatus(employeeId: string): Observable<{ workingStatus: string; workingStatusAt: string }> {
    return this.http.get<{ workingStatus: string; workingStatusAt: string }>(`${this.apiUrl}/${employeeId}`);
  }

  getDebugConfig(employeeId: string): Observable<DebugConfigResponse> {
    return this.http.get<DebugConfigResponse>(`${this.apiUrl}/${employeeId}/debug-config`);
  }

  getStatusHistory(employeeId: string, page = 1, limit = 50): Observable<StatusHistoryResponse> {
    return this.http.get<StatusHistoryResponse>(`${this.apiUrl}/${employeeId}/status-history?page=${page}&limit=${limit}`);
  }
}

export interface EmployeeLogEntry {
  _id: string;
  category: string;
  content: string;
  employeeName: string;
  employeeAvatar: string;
  employeeRole: string;
  projectName: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface EmployeeLogsResponse {
  logs: EmployeeLogEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DebugConfigResponse {
  employee: { name: string; role: string; status: string; roleTools: string[]; sdkTools: string[] };
  projectPath: string;
  settingsLocal: { exists: boolean; content: any; matchesReference: boolean; missing: string[]; extra: string[] };
  globalTrust: { exists: boolean; hasTrust: boolean; allowedTools: string[]; matchesReference: boolean; missingTools: string[] };
  reference: { settingsLocal: any; globalTools: string[] };
  validation: { valid: boolean; issues: string[]; fixed: boolean };
  sessionInfo: { sdkSessionId: string; activeSessionId: string; isAlive: boolean };
}

export interface StatusHistoryEntry {
  _id: string;
  content: string;
  source: 'api' | 'file' | 'manager';
  taskId?: string;
  createdAt: string;
}

export interface StatusHistoryResponse {
  entries: StatusHistoryEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface EmployeeMemoryEntry {
  _id: string;
  category: 'goal' | 'learning' | 'blocker' | 'decision' | 'preference' | 'context';
  content: string;
  source: string;
  importance: number;
  tags: string[];
  accessCount: number;
  createdAt: string;
}
