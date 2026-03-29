import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BruceTodo } from '../models/bruce-todo.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BruceTodoService {
  private apiUrl = `${environment.apiUrl}/bruce-todos`;

  constructor(private http: HttpClient) {}

  list(): Observable<BruceTodo[]> {
    return this.http.get<BruceTodo[]>(this.apiUrl);
  }

  add(text: string, priority: string = 'normal'): Observable<BruceTodo> {
    return this.http.post<BruceTodo>(this.apiUrl, { text, priority });
  }

  toggle(id: string): Observable<BruceTodo> {
    return this.http.patch<BruceTodo>(`${this.apiUrl}/${id}/toggle`, {});
  }

  update(id: string, data: Partial<BruceTodo>): Observable<BruceTodo> {
    return this.http.patch<BruceTodo>(`${this.apiUrl}/${id}`, data);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  clearDone(): Observable<{ cleared: number }> {
    return this.http.delete<{ cleared: number }>(`${this.apiUrl}/done`);
  }
}
