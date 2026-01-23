import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
  private _headers: HttpHeaders | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Get headers with lazy initialization
   */
  private getHeaders(): HttpHeaders {
    if (!this._headers) {
      const headersConfig: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Load token from localStorage if available
      const savedToken = localStorage.getItem('authToken');
      if (savedToken) {
        headersConfig['Authorization'] = `Bearer ${savedToken}`;
      }

      this._headers = new HttpHeaders(headersConfig);
    }
    return this._headers;
  }

  /**
   * Set authorization token in headers and localStorage
   */
  setAuthToken(token: string): void {
    localStorage.setItem('authToken', token);
    // Reset headers to rebuild with new token
    this._headers = null;
  }

  /**
   * Remove authorization token from headers and localStorage
   */
  removeAuthToken(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    // Reset headers to rebuild without token
    this._headers = null;
  }

  /**
   * Set custom header
   */
  setHeader(key: string, value: string): void {
    this._headers = this.getHeaders().set(key, value);
  }

  /**
   * Remove custom header
   */
  removeHeader(key: string): void {
    this._headers = this.getHeaders().delete(key);
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.append(key, params[key].toString());
        }
      });
    }

    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      map(response => {
        if (response.isSuccessful && response.data !== undefined) {
          return response.data;
        }
        return response as any;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, body, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.isSuccessful && response.data !== undefined) {
          return response.data;
        }
        return response as any;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, body, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.isSuccessful && response.data !== undefined) {
          return response.data;
        }
        return response as any;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, body, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.isSuccessful && response.data !== undefined) {
          return response.data;
        }
        return response as any;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.append(key, params[key].toString());
        }
      });
    }

    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      map(response => {
        if (response.isSuccessful && response.data !== undefined) {
          return response.data;
        }
        return response as any;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * POST request with file upload
   */
  postFile<T>(endpoint: string, formData: FormData): Observable<T> {
    const fileHeaders = this.getHeaders().delete('Content-Type'); // Let browser set Content-Type for FormData

    return this.http.post<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, formData, {
      headers: fileHeaders
    }).pipe(
      map(response => {
        if (response.isSuccessful && response.data !== undefined) {
          return response.data;
        }
        return response as any;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * GET request to download file
   */
  downloadFile(endpoint: string, params?: any): Observable<Blob> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.append(key, params[key].toString());
        }
      });
    }

    return this.http.get(`${this.baseUrl}/${endpoint}`, {
      headers: this.getHeaders(),
      params: httpParams,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Bad Request';
          break;
        case 401:
          errorMessage = error.error?.message || 'Unauthorized. Please login again.';
          // You can redirect to login here if needed
          break;
        case 403:
          errorMessage = error.error?.message || 'Forbidden. You do not have permission.';
          break;
        case 404:
          errorMessage = error.error?.message || 'Resource not found';
          break;
        case 500:
          errorMessage = error.error?.message || 'Internal server error';
          break;
        default:
          errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    console.error('API Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  };
}
