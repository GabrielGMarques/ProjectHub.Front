import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Skill, AIModel } from '../models/project.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SkillService {
  private apiUrl = `${environment.apiUrl}/skills`;

  constructor(private http: HttpClient) {}

  getAll(projectId?: string): Observable<Skill[]> {
    const params: Record<string, string> = {};
    if (projectId) params['projectId'] = projectId;
    return this.http.get<Skill[]>(this.apiUrl, { params });
  }

  create(skill: Partial<Skill>): Observable<Skill> {
    return this.http.post<Skill>(this.apiUrl, skill);
  }

  update(id: string, skill: Partial<Skill>): Observable<Skill> {
    return this.http.put<Skill>(`${this.apiUrl}/${id}`, skill);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  execute(skillId: string, projectId: string, model: AIModel): Observable<{ response: string; mode: string }> {
    return this.http.post<{ response: string; mode: string }>(
      `${this.apiUrl}/${skillId}/execute/${projectId}`,
      { model }
    );
  }
}
