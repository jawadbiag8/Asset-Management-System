import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DigitalAssetRequest } from '../components/manage-digital-assets/manage-digital-assets.component';
import { ActiveIncident } from '../components/incidents/active-incidents/active-incidents.component';
import { IncidentRequest } from '../components/incidents/manage-incidents/manage-incidents.component';
import { DigitalAsset } from '../components/dashboard/dashboard.component';
import { AssetControlPanelData } from '../components/assets/asset-control-panel/asset-control-panel.component';

export interface ApiResponse<T = any> {
  isSuccessful: boolean;
  data?: T;
  message?: string | null;
}
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/Auth/login`, {
      username,
      password,
    });
  }

  logout(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/Auth/logout`, {});
  }

  getAllMinistries(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/Ministry/GetAll`);
  }

  getMinistries(searchQuery?: HttpParams): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Ministry`;
    return this.http.get<ApiResponse<any>>(url, { params: searchQuery });
  }

  getDepartmentsByMinistry(ministryId: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(
      `${this.baseUrl}/Department/ministry/${ministryId}`,
    );
  }

  getLovByType(
    lovType:
      | 'citizenImpactLevel'
      | 'SeverityLevel'
      | 'Status'
      | 'IncidentCreationFrequency'
      | 'HealthStatus'
      | 'PerformanceStatus'
      | 'ComplianceStatus'
      | 'RiskExposureIndex',
  ): Observable<ApiResponse> {
    if (lovType === 'HealthStatus') {
      return of({
        isSuccessful: true,
        data: [
          { label: 'HEALTHY', id: 'HEALTHY' },
          { label: 'FAIR', id: 'FAIR' },
          { label: 'POOR', id: 'POOR' },
          { label: 'Unknown', id: 'Unknown' },
        ],
      });
    }

    if (lovType === 'PerformanceStatus') {
      return of({
        isSuccessful: true,
        data: [
          { label: 'GOOD', id: 'GOOD' },
          { label: 'AVERAGE', id: 'AVERAGE' },
          { label: 'BELOW AVERAGE', id: 'BELOW AVERAGE' },
          { label: 'Unknown', id: 'Unknown' },
        ],
      });
    }

    if (lovType === 'ComplianceStatus') {
      return of({
        isSuccessful: true,
        data: [
          { label: 'HIGH', id: 'HIGH' },
          { label: 'MEDIUM', id: 'MEDIUM' },
          { label: 'LOW', id: 'LOW' },
          { label: 'Unknown', id: 'Unknown' },
        ],
      });
    }

    if (lovType === 'RiskExposureIndex') {
      return of({
        isSuccessful: true,
        data: [
          { label: 'LOW RISK', id: 'LOW RISK' },
          { label: 'MEDIUM RISK', id: 'MEDIUM RISK' },
          { label: 'HIGH RISK', id: 'HIGH RISK' },
          { label: 'Unknown', id: 'Unknown' },
        ],
      });
    }

    return this.http.get<ApiResponse>(
      `${this.baseUrl}/CommonLookup/type/${lovType}`,
    );
  }

  getAllKpis(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.baseUrl}/KpisLov/dropdown`,
    );
  }

  getAllUsers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/User/dropdown`);
  }

  // Assets

  getAssets(searchQuery?: HttpParams): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset`;
    return this.http.get<ApiResponse<any>>(url, { params: searchQuery });
  }

  getAllAssets(): Observable<ApiResponse<DigitalAsset[]>> {
    return this.http.get<ApiResponse<DigitalAsset[]>>(
      `${this.baseUrl}/Asset/dropdown`,
    );
  }

  addAsset(asset: DigitalAssetRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/Asset`, asset);
  }

  getAssetById(assetId: number): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset/${assetId}`;
    return this.http.get<ApiResponse<any>>(url);
  }

  updateAsset(
    assetId: number | null,
    asset: DigitalAssetRequest,
  ): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset/${assetId}`;
    return this.http.put<ApiResponse<any>>(url, asset);
  }

  getAssetControlPanelData(
    assetId: number,
  ): Observable<ApiResponse<AssetControlPanelData>> {
    let url = `${this.baseUrl}/Asset/${assetId}/controlpanel`;
    return this.http.get<ApiResponse<AssetControlPanelData>>(url);
  }

  // Incidents

  getIncidents(
    searchQuery: HttpParams,
  ): Observable<ApiResponse<ActiveIncident[]>> {
    let url = `${this.baseUrl}/Incident`;
    return this.http.get<ApiResponse<ActiveIncident[]>>(url, {
      params: searchQuery,
    });
  }

  addIncident(incident: IncidentRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.baseUrl}/Incident`,
      incident,
    );
  }
  getMinistryDetailById(ministryId: any): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset/ministry/${ministryId}/summary`;
    return this.http.get<ApiResponse<any>>(url);
  }
  getIncidentByAssetId(
    assetId: any,
    searchQuery?: HttpParams,
  ): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/Incident/asset/${assetId}`;
    return this.http.get<ApiResponse<any>>(url, {
      params: searchQuery ?? undefined,
    });
  }
  getAssetsDashboad(id: any): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset/${id}/dashboard/header`;
    return this.http.get<ApiResponse<any>>(url);
  }
  getAssestByMinistry(
    searchQuery: HttpParams,
    ministryId: any,
  ): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset/ministry/${ministryId}`;
    return this.http.get<ApiResponse<any>>(url, {
      params: searchQuery,
    });
  }
  getIncidentById(incidentId: number): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Incident/${incidentId}`;
    return this.http.get<ApiResponse<any>>(url);
  }

  // Admin Dashboard

  /**
   * Fetch high-level summary metrics for the admin dashboard.
   * Matches /api/AdminDashboard/summary from the OpenAPI spec.
   */
  getAdminDashboardSummary(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/AdminDashboard/summary`;
    return this.http.get<ApiResponse<any>>(url);
  }

  // PM Dashboard

  getPMDashboard(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/PMDashboard`;
    return this.http.get<ApiResponse<any>>(url);
  }

  getPMDashboardHeader(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/PMDashboard/header`;
    return this.http.get<ApiResponse<any>>(url);
  }

  getPMDashboardIndices(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/PMDashboard/indices`;
    return this.http.get<ApiResponse<any>>(url);
  }

  getPMDashboardBottomMinistries(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/PMDashboard/bottom-ministries`;
    return this.http.get<ApiResponse<any>>(url);
  }

  getPMDashboardTopMinistries(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/PMDashboard/top-ministries`;
    return this.http.get<ApiResponse<any>>(url);
  }
}
