import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { BreadcrumbService } from './services/breadcrumb.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  showHeader = false; // initially hide header to avoid blink
  noHeaderPages = ['login', 'forget-password', 'otp']; // pages where header should hide

  constructor(
    private router: Router,
    private location: Location,
    public breadcrumbService: BreadcrumbService,
  ) {}

  ngOnInit() {
    // Initial check for current URL
    this.updateHeader(this.router.url);

    // Update header on every route change
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateHeader(event.urlAfterRedirects);
      }
    });
  }

  private updateHeader(url: string) {
    // Hide header on noHeaderPages
    this.showHeader = !this.noHeaderPages.some((page) => url.includes(page));
  }

  /** True when breadcrumb is shown and current route is not Dashboard or PM Dashboard. */
  get showBackLink(): boolean {
    if (!this.showHeader || this.breadcrumbService.currentBreadcrumbs().length <= 1) {
      return false;
    }
    const path = this.router.url.split('?')[0].replace(/\/$/, '') || '/';
    return path !== '/dashboard' && path !== '/pm-dashboard' && !path.startsWith('/pm-dashboard/');
  }

  goBack(): void {
    this.location.back();
  }
}
