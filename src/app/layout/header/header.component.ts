import { Component, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
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
  constructor(
    private apiService: ApiService,
    private router: Router,
    private utilsService: UtilsService
  ) {}
  profileDropdownOpen = false;

  @ViewChild('profileDropdown', { static: false }) profileDropdown!: ElementRef;

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
