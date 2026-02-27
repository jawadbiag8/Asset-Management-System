import { Component, OnInit } from '@angular/core';
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
}
