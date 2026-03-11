import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project, ChatMessage, AIModel, AIModelOption } from '../models/project.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  getById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  create(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, project);
  }

  update(id: string, project: Partial<Project>): Observable<Project> {
    return this.http.patch<Project>(`${this.apiUrl}/${id}`, project);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  reorder(projectIds: string[], field: 'sortOrder' | 'burndownSortOrder' = 'sortOrder'): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/reorder`, { projectIds, field });
  }

  uploadDocument(projectId: string, file: File): Observable<Project> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Project>(`${this.apiUrl}/${projectId}/documents`, formData);
  }

  deleteDocument(projectId: string, docId: string): Observable<Project> {
    return this.http.delete<Project>(`${this.apiUrl}/${projectId}/documents/${docId}`);
  }

  getDocumentDownloadUrl(projectId: string, docId: string): string {
    return `${this.apiUrl}/${projectId}/documents/${docId}/download`;
  }

  getAvailableModels(): Observable<AIModelOption[]> {
    return this.http.get<AIModelOption[]>(`${this.apiUrl}/ai/models`);
  }

  aiCoach(projectId: string, messages: ChatMessage[], model: AIModel): Observable<{ response: string }> {
    return this.http.post<{ response: string }>(`${this.apiUrl}/${projectId}/ai/coach`, { messages, model });
  }

  browseFolders(folderPath?: string): Observable<{ current: string; parent: string | null; entries: { name: string; path: string; isDir: boolean }[] }> {
    const params: Record<string, string> = {};
    if (folderPath) params['path'] = folderPath;
    return this.http.get<{ current: string; parent: string | null; entries: { name: string; path: string; isDir: boolean }[] }>(
      `${this.apiUrl}/browse-folders`, { params }
    );
  }

  getTimeAllocation(): Observable<{ projectId: string; name: string; timeConsumption: number }[]> {
    return this.http.get<{ projectId: string; name: string; timeConsumption: number }[]>(
      `${environment.apiUrl}/analytics/time-allocation`
    );
  }
}
