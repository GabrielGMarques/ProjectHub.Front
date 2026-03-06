import { TestBed } from '@angular/core/testing';
import { GanttComponent } from './gantt.component';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { environment } from '../../../environments/environment';

describe('GanttComponent', () => {
  let component: GanttComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GanttComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()],
    }).compileComponents();

    const fixture = TestBed.createComponent(GanttComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load time allocation data on init', () => {
    component.ngOnInit();

    const req = httpMock.expectOne(`${environment.apiUrl}/analytics/time-allocation`);
    req.flush([
      { projectId: '1', name: 'Project A', timeConsumption: 20 },
      { projectId: '2', name: 'Project B', timeConsumption: 10 },
    ]);

    expect(component.data.length).toBe(2);
    expect(component.totalHours).toBe(30);
    expect(component.loading).toBeFalse();
  });
});
