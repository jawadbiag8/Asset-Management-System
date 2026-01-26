import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DigitalAssetRequest } from '../components/manage-digital-assets/manage-digital-assets.component';

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

  constructor(private http: HttpClient) { }

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

  getLovByType(lovType: 'citizenImpactLevel'): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(
      `${this.baseUrl}/CommonLookup/type/${lovType}`,
    );
  }

  // Assets

  getAssets(searchQuery?: HttpParams): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset`;
    return this.http.get<ApiResponse<any>>(url, { params: searchQuery });
  }

  addAsset(asset: DigitalAssetRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/Asset`, asset);
  }


  getAssetById(assetId: number): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset/${assetId}`;
    return this.http.get<ApiResponse<any>>(url);
  }

  updateAsset(assetId: number | null, asset: DigitalAssetRequest): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset/${assetId}`;
    return this.http.put<ApiResponse<any>>(url, asset);
  }

}
