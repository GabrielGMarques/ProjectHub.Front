import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

export interface WSEmployeeStatus {
  employeeId: string;
  projectId: string;
  status: string;
  name: string;
  timestamp: string;
}

export interface WSTaskUpdate {
  employeeId: string;
  projectId: string;
  taskId: string;
  status: string;
  result?: string;
  description: string;
  timestamp: string;
}

export interface WSEmployeeLog {
  employeeId: string;
  projectId: string;
  category: string;
  content: string;
  employeeName: string;
  timestamp: string;
}

export interface WSManagerLog {
  type: string;
  message: string;
  timestamp: string;
}

export interface WSManagerStatus {
  running: boolean;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;

  private employeeStatus$ = new Subject<WSEmployeeStatus>();
  private taskUpdate$ = new Subject<WSTaskUpdate>();
  private taskNew$ = new Subject<WSTaskUpdate>();
  private employeeLog$ = new Subject<WSEmployeeLog>();
  private managerLog$ = new Subject<WSManagerLog>();
  private managerStatus$ = new Subject<WSManagerStatus>();

  connect(): void {
    if (this.socket?.connected) return;

    const baseUrl = environment.apiUrl.replace('/api', '');
    this.socket = io(baseUrl, { path: '/ws', transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => console.log('[WS] Connected'));
    this.socket.on('disconnect', () => console.log('[WS] Disconnected'));

    this.socket.on('employee:status', (data: WSEmployeeStatus) => this.employeeStatus$.next(data));
    this.socket.on('employee:task_update', (data: WSTaskUpdate) => this.taskUpdate$.next(data));
    this.socket.on('employee:task_new', (data: WSTaskUpdate) => this.taskNew$.next(data));
    this.socket.on('employee:log', (data: WSEmployeeLog) => this.employeeLog$.next(data));
    this.socket.on('manager:log', (data: WSManagerLog) => this.managerLog$.next(data));
    this.socket.on('manager:status', (data: WSManagerStatus) => this.managerStatus$.next(data));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  onEmployeeStatus(): Observable<WSEmployeeStatus> { return this.employeeStatus$.asObservable(); }
  onTaskUpdate(): Observable<WSTaskUpdate> { return this.taskUpdate$.asObservable(); }
  onTaskNew(): Observable<WSTaskUpdate> { return this.taskNew$.asObservable(); }
  onEmployeeLog(): Observable<WSEmployeeLog> { return this.employeeLog$.asObservable(); }
  onManagerLog(): Observable<WSManagerLog> { return this.managerLog$.asObservable(); }
  onManagerStatus(): Observable<WSManagerStatus> { return this.managerStatus$.asObservable(); }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
