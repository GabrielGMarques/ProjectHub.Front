import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GitHubRepo } from '../models/github-repo.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GitHubService {
  private apiUrl = `${environment.apiUrl}/github`;

  constructor(private http: HttpClient) {}

  getRepos(): Observable<GitHubRepo[]> {
    return this.http.get<GitHubRepo[]>(`${this.apiUrl}/repos`);
  }

  getRepoDetails(owner: string, repo: string): Observable<GitHubRepo> {
    return this.http.get<GitHubRepo>(`${this.apiUrl}/repos/${owner}/${repo}`);
  }
}
