import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  path?: string; // Optional - if not provided, it's the current page (not a link)
  queryParams?: { [key: string]: any }; // Optional query parameters
}

@Component({
  selector: 'app-reusable-breadcrum',
  standalone: false,
  templateUrl: './reusable-breadcrum.component.html',
  styleUrl: './reusable-breadcrum.component.scss'
})
export class ReusableBreadcrumComponent {
  @Input() breadcrumbs: BreadcrumbItem[] = [];
  @Input() pageTitle?: string; // Optional page title to display below breadcrumb

  constructor(private router: Router) {}

  navigate(item: BreadcrumbItem) {
    if (item.path) {
      if (item.queryParams) {
        this.router.navigate([item.path], { queryParams: item.queryParams });
      } else if (item.path.includes('?')) {
        // Handle query params in path string
        const [path, queryString] = item.path.split('?');
        const params: { [key: string]: string } = {};
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=');
          params[key] = value;
        });
        this.router.navigate([path], { queryParams: params });
      } else {
        this.router.navigate([item.path]);
      }
    }
  }
}
