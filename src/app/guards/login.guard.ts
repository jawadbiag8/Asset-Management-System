import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UtilsService } from '../services/utils.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {

  constructor(
    private utilsService: UtilsService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const token = this.utilsService.getStorage<string>('token', false);
    
    if (token) {
      // Already authenticated: PMO Executive -> Executive Dashboard, others -> dashboard
      const user = this.utilsService.getStorage<{ role?: string }>('user', true);
      const role = user?.role ?? '';
      if (role === 'PMO Executive') {
        this.router.navigate(['/pm-dashboard']);
      } else {
        this.router.navigate(['/dashboard']);
      }
      return false;
    }

    // Not authenticated, allow access to login page
    return true;
  }
}
