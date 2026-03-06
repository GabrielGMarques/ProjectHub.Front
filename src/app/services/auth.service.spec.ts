import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false when not logged in', () => {
    expect(service.isLoggedIn).toBeFalse();
  });

  it('should return true when token exists', () => {
    service.setToken('test-token');
    expect(service.isLoggedIn).toBeTrue();
  });

  it('should clear token on logout', () => {
    service.setToken('test-token');
    service.logout();
    expect(service.isLoggedIn).toBeFalse();
  });

  it('should fetch profile', () => {
    service.getProfile().subscribe((user) => {
      expect(user.username).toBe('testuser');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/profile`);
    expect(req.request.method).toBe('GET');
    req.flush({ _id: '1', githubId: '123', username: 'testuser', displayName: 'Test', avatarUrl: '' });
  });
});
