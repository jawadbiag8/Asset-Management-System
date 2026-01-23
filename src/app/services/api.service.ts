import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiResponse<T = any> {
  isSuccessful: boolean;
  data?: T;
  message?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/Auth/login`, { username, password });
  }

  logout(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/Auth/logout`, {});
  }

  // Generic GET method
  get<T>(endpoint: string, params?: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.get<ApiResponse<T> | T>(url, { params }).pipe(
      map((response: ApiResponse<T> | T) => {
        // Check if response is wrapped in ApiResponse
        if (response && typeof response === 'object' && 'isSuccessful' in response) {
          const apiResponse = response as ApiResponse<T>;
          if (apiResponse.isSuccessful && apiResponse.data !== undefined) {
            return apiResponse.data;
          }
        }
        // If response is already the expected type (not wrapped), return it directly
        return response as T;
      })
    );
  }

  // Generic POST method
  post<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.post<ApiResponse<T>>(url, body).pipe(
      map((response: ApiResponse<T>) => {
        if (response.isSuccessful && response.data !== undefined) {
          return response.data;
        }
        return response as unknown as T;
      })
    );
  }

  // Generic PUT method
  put<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.put<ApiResponse<T>>(url, body).pipe(
      map((response: ApiResponse<T>) => {
        if (response.isSuccessful && response.data !== undefined) {
          return response.data;
        }
        return response as unknown as T;
      })
    );
  }

  // Generic DELETE method
  delete<T>(endpoint: string): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.delete<ApiResponse<T>>(url).pipe(
      map((response: ApiResponse<T>) => {
        if (response.isSuccessful && response.data !== undefined) {
          return response.data;
        }
        return response as unknown as T;
      })
    );
  }

  // Assets

  getAssets(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/Asset`);
  }

}
