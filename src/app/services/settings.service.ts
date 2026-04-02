import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export interface ActionRoute {
  action: string;
  model: ModelTier;
  label: string;
  category: 'employee' | 'alfred' | 'strategic';
}

export interface RoleDefault {
  role: string;
  model: ModelTier;
}

export interface SubAgentDefaults {
  exploration: 'haiku' | 'sonnet';
  implementation: 'sonnet' | 'opus';
  commands: 'haiku' | 'sonnet';
  testing: 'sonnet' | 'opus';
}

export interface ModelRoutingConfig {
  _id: string;
  userId: string;
  globalDefault: ModelTier;
  roleDefaults: RoleDefault[];
  actionRoutes: ActionRoute[];
  subAgentDefaults: SubAgentDefaults;
  escalation: {
    enabled: boolean;
    maxEscalation: ModelTier;
  };
  schemaVersion: number;
  updatedAt: string;
}

export interface CostEstimate {
  currentConfig: { daily: number; byModel: Record<string, number> };
  allSonnetBaseline: { daily: number };
  savingsPercent: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private apiUrl = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) {}

  getModelRouting(): Observable<ModelRoutingConfig> {
    return this.http.get<ModelRoutingConfig>(`${this.apiUrl}/model-routing`);
  }

  updateGlobalDefault(model: ModelTier): Observable<ModelRoutingConfig> {
    return this.http.patch<ModelRoutingConfig>(`${this.apiUrl}/model-routing/global`, { model });
  }

  updateActionRoute(action: string, model: ModelTier): Observable<ModelRoutingConfig> {
    return this.http.patch<ModelRoutingConfig>(`${this.apiUrl}/model-routing/action`, { action, model });
  }

  updateRoleDefault(role: string, model: ModelTier): Observable<ModelRoutingConfig> {
    return this.http.patch<ModelRoutingConfig>(`${this.apiUrl}/model-routing/role`, { role, model });
  }

  updateSubAgentDefaults(defaults: Partial<SubAgentDefaults>): Observable<ModelRoutingConfig> {
    return this.http.patch<ModelRoutingConfig>(`${this.apiUrl}/model-routing/sub-agents`, defaults);
  }

  updateEscalation(escalation: { enabled?: boolean; maxEscalation?: ModelTier }): Observable<ModelRoutingConfig> {
    return this.http.patch<ModelRoutingConfig>(`${this.apiUrl}/model-routing/escalation`, escalation);
  }

  getDefaults(): Observable<any> {
    return this.http.get(`${this.apiUrl}/model-routing/defaults`);
  }

  resetToDefaults(): Observable<ModelRoutingConfig> {
    return this.http.post<ModelRoutingConfig>(`${this.apiUrl}/model-routing/reset`, {});
  }

  getCostEstimate(days: number = 7): Observable<CostEstimate> {
    return this.http.get<CostEstimate>(`${this.apiUrl}/model-routing/cost-estimate`, { params: { days: days.toString() } });
  }
}
