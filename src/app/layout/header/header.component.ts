import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  // imports: [],
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  menuOpen = false;
  activeLink: string = 'dashboard'; // default active
  private routerSubscription?: Subscription;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Set active link based on current route
    this.updateActiveLink(this.router.url);

    // Subscribe to route changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateActiveLink(event.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  updateActiveLink(url: string): void {
    if (url.includes('/dashboard')) {
      this.activeLink = 'dashboard';
    } else if (url.includes('/assets')) {
      this.activeLink = 'assets';
    } else if (url.includes('/incidents')) {
      this.activeLink = 'incidents';
    } else {
      this.activeLink = 'dashboard'; // default
    }
  }

  setActive(link: string) {
    this.activeLink = link;
    
    // Navigate based on link
    switch(link) {
      case 'dashboard':
        this.router.navigate(['/dashboard']);
        break;
      case 'assets':
        this.router.navigate(['/assets/by-ministry']);
        break;
      case 'incidents':
        this.router.navigate(['/incidents']);
        break;
    }
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
