import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { UtilsService } from './services/utils.service';
import { HeaderComponent } from './layout/header/header.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true, // standalone component
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [CommonModule, HeaderComponent, RouterOutlet],
})
export class AppComponent implements OnInit {
  showHeader = false; // initially hide header to avoid blink
  noHeaderPages = ['login', 'forget-password', 'otp']; // pages where header should hide

  constructor(
    public utilsService: UtilsService,
    private router: Router,
  ) {}

  ngOnInit() {
    // Log environment
    const env = this.utilsService.getEnvironment();
    console.log('Environment:', env);

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
