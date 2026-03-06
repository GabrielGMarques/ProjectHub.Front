import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProjectService } from './project.service';
import { Project } from '../models/project.model';
import { environment } from '../../environments/environment';

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProjectService],
    });
    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all projects', () => {
    const mockProjects: Project[] = [
      { name: 'Test', description: '', backgroundImage: '', githubRepos: [], mrr: 0, clientCount: 0, impact: 'low', niche: '', timeConsumption: 0 },
    ];

    service.getAll().subscribe((projects) => {
      expect(projects.length).toBe(1);
      expect(projects[0].name).toBe('Test');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProjects);
  });

  it('should create a project', () => {
    const newProject: Partial<Project> = { name: 'New Project', mrr: 100 };

    service.create(newProject).subscribe((project) => {
      expect(project.name).toBe('New Project');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...newProject, _id: '123' });
  });

  it('should update a project', () => {
    service.update('123', { mrr: 200 }).subscribe((project) => {
      expect(project.mrr).toBe(200);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/123`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ _id: '123', name: 'Test', mrr: 200 });
  });

  it('should delete a project', () => {
    service.delete('123').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/123`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('should fetch time allocation', () => {
    service.getTimeAllocation().subscribe((data) => {
      expect(data.length).toBe(2);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/analytics/time-allocation`);
    expect(req.request.method).toBe('GET');
    req.flush([
      { projectId: '1', name: 'A', timeConsumption: 10 },
      { projectId: '2', name: 'B', timeConsumption: 20 },
    ]);
  });
});
