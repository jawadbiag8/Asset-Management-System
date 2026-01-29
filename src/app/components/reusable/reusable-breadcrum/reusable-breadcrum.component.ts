import { Component, Input } from '@angular/core';

export interface BreadcrumbItem {
  label: string;
  path?: string; // Optional - if not provided, it's the current page (not a link)
  queryParams?: { [key: string]: string | number }; // Optional query params for the route
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
}
