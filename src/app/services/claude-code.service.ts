import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClaudeCodeEvent } from '../models/project.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClaudeCodeService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private zone: NgZone) {}

  checkStatus(): Observable<{ available: boolean; version: string }> {
    return this.http.get<{ available: boolean; version: string }>(`${this.apiUrl}/claude-code/status`);
  }

  runAgent(projectId: string, prompt: string): Observable<ClaudeCodeEvent> {
    return new Observable(observer => {
      const token = localStorage.getItem('token');

      fetch(`${this.apiUrl}/projects/${projectId}/agent/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      }).then(async response => {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

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
        this.zone.run(() => observer.complete());
      }).catch(err => {
        this.zone.run(() => observer.error(err));
      });
    });
  }

  cancelAgent(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/claude-code/cancel`, { sessionId });
  }
}
