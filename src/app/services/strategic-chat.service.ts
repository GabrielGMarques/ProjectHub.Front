import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AIModel, ClaudeCodeEvent } from '../models/project.model';
import { environment } from '../../environments/environment';

export interface StrategicAction {
  type: 'add_todos' | 'update_field' | 'create_project' | 'run_agent' | 'prioritize';
  projectId?: string;
  projectName?: string;
  items?: string[];
  field?: string;
  value?: string;
  prompt?: string;
  projectIds?: string[];
  status: 'pending' | 'accepted' | 'rejected';
}

export interface StrategicMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: StrategicAction[];
  timestamp?: string;
}

@Injectable({ providedIn: 'root' })
export class StrategicChatService {
  private apiUrl = `${environment.apiUrl}/strategic-chat`;

  constructor(private http: HttpClient, private zone: NgZone) {}

  chat(messages: StrategicMessage[], model: AIModel): Observable<{ response: string }> {
    return this.http.post<{ response: string }>(`${this.apiUrl}/chat`, { messages, model });
  }

  getMessages(): Observable<StrategicMessage[]> {
    return this.http.get<StrategicMessage[]>(`${this.apiUrl}/messages`);
  }

  saveMessages(messages: StrategicMessage[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/messages`, { messages });
  }

  clearMessages(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/messages`);
  }

  executeAction(action: StrategicAction): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/execute-action`, { action });
  }

  /** Execute run_agent action with SSE streaming */
  executeAgentAction(action: StrategicAction): Observable<ClaudeCodeEvent> {
    return new Observable(observer => {
      const token = localStorage.getItem('token');
      const abortController = new AbortController();

      fetch(`${this.apiUrl}/execute-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
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

      return () => abortController.abort();
    });
  }

  getActiveSessions(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/claude-code/active-sessions`);
  }

  stopAllSessions(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/claude-code/stop-all`, {});
  }
}
