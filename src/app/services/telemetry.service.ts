import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TelemetryEventItem {
  _id: string;
  type: string;
  source: string;
  status: string;
  description: string;
  error?: string;
  durationMs?: number;
  projectId?: { _id: string; name: string };
  employeeId?: { _id: string; name: string; avatar: string };
  createdAt: string;
}

export interface ExecutionLogGroup {
  source: string;
  employeeId?: { _id: string; name: string; avatar: string; role: string; title: string };
  projectId?: { _id: string; name: string };
  events: TelemetryEventItem[];
  stats: { total: number; completed: number; failed: number; started: number; cancelled: number; totalDurationMs: number };
}

export interface ExecutionLog {
  groups: ExecutionLogGroup[];
  summary: { total: number; completed: number; failed: number; activeNow: number };
}

export interface EmployeeLogItem {
  _id: string;
  employeeId: string;
  projectId: string;
  category: 'task_start' | 'task_complete' | 'task_fail' | 'tool_use' | 'tool_result' | 'text' | 'error' | 'comms';
  employeeName: string;
  employeeAvatar: string;
  employeeRole: string;
  projectName: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface EmployeeLogEmployee {
  id: string;
  name: string;
  avatar: string;
  role: string;
  projectName: string;
  total: number;
  errors: number;
  tasks: number;
}

export interface EmployeeLogsResponse {
  logs: EmployeeLogItem[];
  employees: EmployeeLogEmployee[];
  stats: { total: number; taskStarts: number; taskCompletes: number; taskFails: number; toolUses: number; errors: number };
}

export interface ManagerLogItem {
  _id: string;
  category: 'message' | 'ai_call' | 'action' | 'watchdog' | 'loop' | 'error' | 'voice';
  direction?: 'inbound' | 'outbound';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ManagerLogsResponse {
  logs: ManagerLogItem[];
  stats: { total: number; messages: number; aiCalls: number; actions: number; errors: number; watchdog: number; loop: number; voice: number };
}

export interface TelemetryStats {
  totalRuns: number;
  completed: number;
  failed: number;
  cancelled: number;
  avgDurationMs: number;
  errorCount: number;
  dailyBreakdown: { date: string; completed: number; failed: number; total: number }[];
  sourceBreakdown: { source: string; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private apiUrl = `${environment.apiUrl}/telemetry`;

  constructor(private http: HttpClient) {}

  getStats(days: number = 7): Observable<TelemetryStats> {
    return this.http.get<TelemetryStats>(`${this.apiUrl}/stats`, { params: { days: days.toString() } });
  }

  getEvents(filters?: Record<string, string>): Observable<{ events: TelemetryEventItem[]; total: number }> {
    return this.http.get<any>(`${this.apiUrl}/events`, { params: filters || {} });
  }

  getErrors(limit: number = 50): Observable<TelemetryEventItem[]> {
    return this.http.get<TelemetryEventItem[]>(`${this.apiUrl}/errors`, { params: { limit: limit.toString() } });
  }

  getExecutionLog(hours: number = 48): Observable<ExecutionLog> {
    return this.http.get<ExecutionLog>(`${this.apiUrl}/execution-log`, { params: { hours: hours.toString() } });
  }

  getEmployeeLogs(employeeId?: string, category?: string): Observable<EmployeeLogsResponse> {
    const params: any = {};
    if (employeeId) params.employeeId = employeeId;
    if (category) params.category = category;
    return this.http.get<EmployeeLogsResponse>(`${this.apiUrl}/employee-logs`, { params });
  }

  getManagerLogs(category?: string): Observable<ManagerLogsResponse> {
    const params: any = {};
    if (category) params.category = category;
    return this.http.get<ManagerLogsResponse>(`${this.apiUrl}/manager-logs`, { params });
  }
}
