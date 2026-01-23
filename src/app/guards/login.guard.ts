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
      // Already authenticated, redirect to dashboard
      this.router.navigate(['/dashboard']);
      return false;
    }

    // Not authenticated, allow access to login page
    return true;
  }
}
