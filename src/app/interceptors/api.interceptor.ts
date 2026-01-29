import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { UtilsService } from '../services/utils.service';
import { LoaderService } from '../services/loader.service';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    private utilsService: UtilsService,
    private loaderService: LoaderService
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only intercept requests to the API base URL
    if (!req.url.startsWith(environment.apiUrl)) {
      return next.handle(req);
    }

    // Show loader
    this.loaderService.show();

    // Clone the request and add headers
    let clonedRequest = req.clone({
      setHeaders: this.getHeaders(req)
    });

    // Handle the request and catch errors
    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        return this.handleError(error);
      }),
      finalize(() => {
        // Hide loader when request completes (success or error)
        this.loaderService.hide();
      })
    );
  }

  /**
   * Get headers to add to the request
   */
  private getHeaders(req: HttpRequest<any>): { [key: string]: string } {
    const headers: { [key: string]: string } = {};

    // Add Content-Type only if not FormData (browser will set it automatically)
    if (!(req.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Add Accept header
    headers['Accept'] = 'application/json';

    // Add Authorization token if available
    const authToken = this.utilsService.getStorage<string>('token', false);
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
  }

  /**
   * Handle HTTP errors globally.
   * For 401: show "Session expired" once, then redirect to login; no raw HTTP message.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let defaultMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      defaultMessage = 'A client-side error occurred';
    } else {
      const status = error.status;
      switch (status) {
        case 400:
          defaultMessage = 'Bad request. Please check your input.';
          break;
        case 401: {
          // Show session expired only once; then redirect. Do not show raw 401 message.
          if (!this.utilsService.getSessionExpiredHandled()) {
            this.utilsService.showToast('Session expired. Please login again.', 'Session expired', 'error');
            this.utilsService.setSessionExpiredHandled(true);
          }
          this.utilsService.clearStorage();
          this.router.navigate(['/login']);
          return throwError(() => new Error('Session expired. Please login again.'));
        }
        case 403:
          defaultMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          defaultMessage = 'The requested resource was not found.';
          break;
        case 500:
          defaultMessage = 'Internal server error. Please try again later.';
          break;
        default:
          defaultMessage = 'An error occurred. Please try again.';
      }
    }

    const errorMessage: string = this.utilsService.showToast(error, defaultMessage, 'error', true) as string;
    return throwError(() => new Error(errorMessage));
  }
}
