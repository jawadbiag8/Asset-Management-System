import { Injectable } from '@angular/core';

/**
 * Holds dashboard URL query params to restore when returning from edit/add asset.
 * Ensures filters are retained after user edits an asset and comes back.
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardReturnStateService {
  /** Query params to apply when navigating back to /dashboard (e.g. after edit submit). */
  returnQueryParams: Record<string, string> | null = null;

  setReturnQueryParams(params: Record<string, string> | null): void {
    this.returnQueryParams = params;
  }

  consumeReturnQueryParams(): Record<string, string> | null {
    const params = this.returnQueryParams;
    this.returnQueryParams = null;
    return params;
  }
}
