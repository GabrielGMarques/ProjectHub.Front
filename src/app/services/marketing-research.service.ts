import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AIModel, MarketingResearch } from '../models/project.model';
import { environment } from '../../environments/environment';

export interface ResearchStepEvent {
  type?: string;
  name?: string;
  status?: string;
  result?: any;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class MarketingResearchService {
  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient, private zone: NgZone) {}

  runFullResearch(projectId: string, model: AIModel): Observable<ResearchStepEvent> {
    return new Observable(observer => {
      const token = localStorage.getItem('token');
      const eventSource = new EventSource(
        `${this.apiUrl}/${projectId}/marketing/research?token=${token}`
      );

      // SSE via POST isn't natively supported by EventSource, so we use fetch + ReadableStream
      fetch(`${this.apiUrl}/${projectId}/marketing/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ model }),
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

      // Clean up EventSource if it was created
      return () => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
        }
      };
    });
  }

  runSingleStep(projectId: string, step: string, model: AIModel): Observable<any> {
    return this.http.post(`${this.apiUrl}/${projectId}/marketing/research/${step}`, { model });
  }

  getLatest(projectId: string): Observable<MarketingResearch> {
    return this.http.get<MarketingResearch>(`${this.apiUrl}/${projectId}/marketing/latest`);
  }
}
