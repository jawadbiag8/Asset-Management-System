import { Component, HostListener, ElementRef, ViewChild } from '@angular/core';
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
  currentRoute: string = '';

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
        this.currentRoute = event.url;
      });
    
    // Set initial route
    this.currentRoute = this.router.url;
  }

  isAssetsActive(): boolean {
    return (
      this.currentRoute.includes('/assets') ||
      this.currentRoute.includes('/add-digital-assets') ||
      this.currentRoute.includes('/edit-digital-assets') ||
      this.currentRoute.includes('/ministry-detail') ||
      this.currentRoute.includes('/view-assets-detail')
    );
  }

  isDashboardActive(): boolean {
    return this.currentRoute === '/dashboard' || this.currentRoute === '/';
  }

  isIncidentsActive(): boolean {
    return this.currentRoute.includes('/incidents');
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
