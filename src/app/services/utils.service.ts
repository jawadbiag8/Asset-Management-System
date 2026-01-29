import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { ReusableTableComponent } from '../components/reusable/reusable-table/reusable-table.component';

export interface AppConfig {
  production?: boolean;
  apiUrl?: string;
  appName?: string;
  version?: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  private tableComponentRef: ReusableTableComponent | null = null;
  /** When true, error toasts are skipped (used after showing single "Session expired" for 401). */
  private sessionExpiredHandled = false;
  /** Cached config from assets/config.json */
  private configCache: AppConfig | null = null;

  constructor(
    private toastr: ToastrService,
    private http: HttpClient
  ) { }

  setSessionExpiredHandled(value: boolean): void {
    this.sessionExpiredHandled = value;
  }

  getSessionExpiredHandled(): boolean {
    return this.sessionExpiredHandled;
  }

  getEnvironmentVariable(key: keyof AppConfig): any {
    if (this.configCache == null) return undefined;
    return (this.configCache as any)[key];
  }

  getEnvironment(): AppConfig {
    return (this.configCache ?? {}) as AppConfig;
  }

  getAppConfig(): Observable<AppConfig> {
    return this.http.get<AppConfig>('assets/config.json').pipe(
      map((config) => {
        this.configCache = config ?? {};
        return this.configCache;
      }),
      catchError((err) => {
        console.warn('Failed to load assets/config.json', err);
        return of({});
      })
    );
  }

  /**
   * Set data in localStorage
   * @param key - The key to store the data under
   * @param value - The value to store (will be stringified if object)
   */
  setStorage<T>(key: string, value: T): void {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Get data from localStorage
   * @param key - The key to retrieve data from
   * @param parseJson - Whether to parse JSON (default: true)
   * @returns The stored value or null if not found
   */
  getStorage<T>(key: string, parseJson: boolean = true): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }

      if (parseJson) {
        try {
          return JSON.parse(item) as T;
        } catch {
          // If parsing fails, return as string
          return item as T;
        }
      }

      return item as T;
    } catch (error) {
      console.error(`Error getting localStorage key "${key}":`, error);
      return null;
    }
  }

  /**
   * Remove data from localStorage
   * @param key - The key to remove
   */
  removeStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }

  /**
   * Clear all data from localStorage
   */
  clearStorage(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Show toast notification
   * @param error - Error object or string to extract message from
   * @param msg - Default message if error extraction fails
   * @param msgType - Type of toast: 'danger' | 'success' | 'info' | 'warning' (default: 'danger')
   * @param onlyReturnMessage - If true, only return the message without showing toast (default: false)
   * @returns The message that was displayed or extracted
   */
  showToast(
    error: any,
    msg: string = '',
    msgType: 'success' | 'info' | 'warning' | 'error' = 'error',
    onlyReturnMessage: boolean = false
  ): string | void {
    // After 401 we show only one "Session expired" toast; skip other error toasts
    if (this.sessionExpiredHandled && msgType === 'error') {
      return onlyReturnMessage ? msg : undefined;
    }

    let errorMessage = msg;

    if (typeof error === 'string') {
      errorMessage = error;
    } else if (typeof error?.error === 'string') {
      errorMessage = error.error;
    } else if (error?.error?.ErrorMessage) {
      errorMessage = error.error.ErrorMessage;
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.error?.error) {
      errorMessage = error.error.error;
    } else if (error?.message) {
      errorMessage = error.message;
    }




    // If only returning message, don't show toast
    if (onlyReturnMessage) {
      return errorMessage;
    }


    this.toastr[msgType](errorMessage);
  }

  /**
   * Register the table component reference for refresh functionality
   * @param tableComponent - Reference to the ReusableTableComponent instance
   */
  registerTableComponent(tableComponent: ReusableTableComponent | null | undefined): void {
    this.tableComponentRef = tableComponent || null;
  }

  /**
   * Refresh table data by calling the refresh method on the registered table component
   */
  refreshTableData(): void {
    if (this.tableComponentRef) {
      this.tableComponentRef.onRefresh();
    } else {
      console.warn('Table component reference is not registered. Make sure the table component has initialized.');
    }
  }
}
