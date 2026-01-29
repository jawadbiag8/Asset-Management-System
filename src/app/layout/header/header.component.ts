import { Component, HostListener, ElementRef, ViewChild, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { UtilsService } from '../../services/utils.service';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  menuOpen = false;
  profileDropdownOpen = false;
  currentRoute = signal<string>('');

  user = signal<{ userName: string, role: string }>({
    userName: '',
    role: ''
  })

  @ViewChild('profileDropdown', { static: false }) profileDropdown!: ElementRef;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private utilsService: UtilsService
  ) {
    // Track current route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute.set(event.url);
      });

    const userData = this.utilsService.getStorage<{ username?: string; role?: string }>('user');
    this.user.set({
      userName: userData?.username || '',
      role: userData?.role || 'Admin'
    })
    // Set initial route
    this.currentRoute.set(this.router.url);
  }

  isAssetsActive(): boolean {
    const route = this.currentRoute();
    return (
      route.includes('/assets/by-ministry') ||
      route.includes('/ministry-detail') ||
      route.includes('/view-assets-detail') ||
      route.includes('/add-digital-assets') ||
      route.includes('/edit-digital-asset')
    );
  }

  isDashboardActive(): boolean {
    const route = this.currentRoute();
    // Active on dashboard and root only (Ministries is active for view-assets-detail, add/edit digital assets)
    const isDashboardRoute = route === '/dashboard' || route === '/';
    const isMinistryRoute = route.includes('/assets/by-ministry') ||
      route.includes('/ministry-detail') ||
      route.includes('/view-assets-detail') ||
      route.includes('/add-digital-assets') ||
      route.includes('/edit-digital-asset');
    const isIncidentsRoute = route.includes('/incidents');

    return isDashboardRoute && !isMinistryRoute && !isIncidentsRoute;
  }

  isIncidentsActive(): boolean {
    return this.currentRoute().includes('/incidents');
  }

  isPmDashboardActive(): boolean {
    return this.currentRoute().includes('/pm-dashboard');
  }

  navigateToPmDashboard(): void {
    this.router.navigate(['/pm-dashboard']);
  }

  toggleProfileDropdown() {
    this.profileDropdownOpen = !this.profileDropdownOpen;
    console.log('Profile dropdown open:', this.profileDropdownOpen);
  }

  closeProfileDropdown() {
    this.profileDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.profileDropdown && this.profileDropdownOpen) {
      const target = event.target as HTMLElement;
      if (!this.profileDropdown.nativeElement.contains(target)) {
        this.closeProfileDropdown();
      }
    }
  }

  logout() {
    // Close profile dropdown
    this.closeProfileDropdown();

    // Call logout API
    this.apiService.logout().subscribe({
      next: () => {
        // Clear token and user data
        this.utilsService.clearStorage();

        // Close mobile menu if open
        this.menuOpen = false;

        // Redirect to login
        this.router.navigate(['/login']);
      },
      error: (error: any) => {
        // Even if API call fails, clear local data and logout
        console.error('Logout error:', error);
        this.utilsService.clearStorage();
        this.menuOpen = false;
        this.router.navigate(['/login']);
      },
    });
  }
}
