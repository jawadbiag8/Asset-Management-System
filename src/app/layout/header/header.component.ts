import {
  Component,
  HostListener,
  ElementRef,
  ViewChild,
  signal,
} from '@angular/core';
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

  user = signal<{ name: string; role: string }>({
    name: '',
    role: '',
  });

  @ViewChild('profileDropdown', { static: false }) profileDropdown!: ElementRef;

  /** User initials for avatar (e.g. "PMO USER" → "PU") */
  getInitials(): string {
    const name = this.user().name?.trim() || '';
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
    }
    return name.slice(0, 2).toUpperCase();
  }

  constructor(
    private apiService: ApiService,
    private router: Router,
    private utilsService: UtilsService,
  ) {
    // Track current route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute.set(event.url);
      });

    const userData = this.utilsService.getStorage<{
      username?: string;
      name?: string;
      role?: string;
    }>('user');
    this.user.set({
      name: userData?.name || userData?.username || '',
      role: userData?.role || 'Admin',
    });
    // Set initial route
    this.currentRoute.set(this.router.url);
  }

  isAssetsActive(): boolean {
    const route = this.currentRoute();
    return (
      route.includes('/assets') ||
      route.includes('/ministries') ||
      route.includes('/ministry-detail') ||
      route.includes('/view-assets-detail') ||
      route.includes('/add-digital-assets') ||
      route.includes('/edit-digital-asset')
    );
  }

  isDashboardActive(): boolean {
    const route = this.currentRoute();
    // Path only (ignore query params) so Dashboard stays active when filters are selected
    const path = route.split('?')[0];
    const isDashboardRoute = path === '/dashboard' || path === '/';
    const isMinistryRoute =
      route.includes('/ministries') ||
      route.includes('/ministries') ||
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

  /** Show Executive Dashboard button only when role is PMO Executive */
  isPmoExecutive(): boolean {
    return this.user().role === 'PMO Executive';
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
    this.utilsService.clearStorage();
    this.router.navigate(['/login']);
  }
}
