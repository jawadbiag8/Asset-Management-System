import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-header',
  // imports: [],
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  menuOpen = false;
  activeLink: string = 'dashboard'; // default active

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  setActive(link: string) {
    this.activeLink = link;
  }

  logout() {
    // Call logout API
    this.apiService.post('Auth/logout', {}).subscribe({
      next: () => {
        // Clear token and user data
        this.apiService.removeAuthToken();
        
        // Close mobile menu if open
        this.menuOpen = false;
        
        // Redirect to login
        this.router.navigate(['/login']);
      },
      error: (error) => {
        // Even if API call fails, clear local data and logout
        console.error('Logout error:', error);
        this.apiService.removeAuthToken();
        this.menuOpen = false;
        this.router.navigate(['/login']);
      }
    });
  }
}
