import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AgentSession, ClaudeCodeEvent } from '../models/project.model';
import { environment } from '../../environments/environment';

export interface AgentSessionSummary {
  sessionId: string;
  sdkSessionId?: string;
  status: string;
  prompt?: string;
  createdAt: string;
  completedAt?: string;
  eventCount: number;
}

@Injectable({ providedIn: 'root' })
export class ClaudeCodeService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private zone: NgZone) {}

  checkStatus(): Observable<{ available: boolean; version: string }> {
    return this.http.get<{ available: boolean; version: string }>(`${this.apiUrl}/claude-code/status`);
  }

  runAgent(projectId: string, prompt: string, resumeSdkSessionId?: string): Observable<ClaudeCodeEvent> {
    return new Observable(observer => {
      const token = localStorage.getItem('token');
      const abortController = new AbortController();

      fetch(`${this.apiUrl}/projects/${projectId}/agent/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, resumeSdkSessionId }),
        signal: abortController.signal,
      }).then(async response => {
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

      return () => {
        abortController.abort();
      };
    });
  }

  getSessions(projectId: string): Observable<AgentSessionSummary[]> {
    return this.http.get<AgentSessionSummary[]>(`${this.apiUrl}/projects/${projectId}/agent/sessions`);
  }

  getSession(projectId: string, sessionId: string): Observable<AgentSession> {
    return this.http.get<AgentSession>(`${this.apiUrl}/projects/${projectId}/agent/sessions/${sessionId}`);
  }

  cancelAgent(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/claude-code/cancel`, { sessionId });
  }
}
