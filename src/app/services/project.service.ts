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

  saveCoachMessages(projectId: string, messages: ChatMessage[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${projectId}/ai/coach/messages`, { messages });
  }

  clearCoachMessages(projectId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${projectId}/ai/coach/messages`);
  }

  pickFolder(): Observable<{ path: string }> {
    return this.http.post<{ path: string }>(`${this.apiUrl}/pick-folder`, {});
  }

  browseFolders(folderPath?: string): Observable<{ current: string; parent: string | null; entries: { name: string; path: string; isDir: boolean }[] }> {
    const params: Record<string, string> = {};
    if (folderPath) params['path'] = folderPath;
    return this.http.get<{ current: string; parent: string | null; entries: { name: string; path: string; isDir: boolean }[] }>(
      `${this.apiUrl}/browse-folders`, { params }
    );
  }

  listFiles(projectId: string, dirPath?: string, root?: string): Observable<{
    current: string; parent: string | null;
    entries: { name: string; path: string; isDir: boolean; size?: number; ext?: string }[]
  }> {
    const params: Record<string, string> = {};
    if (dirPath) params['path'] = dirPath;
    if (root) params['root'] = root;
    return this.http.get<any>(`${this.apiUrl}/${projectId}/files/list`, { params });
  }

  readFile(projectId: string, filePath: string, root?: string): Observable<{ path: string; content: string; size: number }> {
    const params: Record<string, string> = { path: filePath };
    if (root) params['root'] = root;
    return this.http.get<any>(`${this.apiUrl}/${projectId}/files/read`, { params });
  }

  writeFile(projectId: string, filePath: string, content: string, root?: string): Observable<{ message: string; path: string }> {
    return this.http.post<any>(`${this.apiUrl}/${projectId}/files/write`, { path: filePath, content, root });
  }

  openInExplorer(projectId: string, relativePath?: string, root?: string): Observable<{ message: string }> {
    return this.http.post<any>(`${this.apiUrl}/${projectId}/files/open-in-explorer`, { path: relativePath || '', root });
  }

  getTimeAllocation(): Observable<{ projectId: string; name: string; timeConsumption: number }[]> {
    return this.http.get<{ projectId: string; name: string; timeConsumption: number }[]>(
      `${environment.apiUrl}/analytics/time-allocation`
    );
  }
}
