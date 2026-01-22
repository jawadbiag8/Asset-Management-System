import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboardkpi',
  templateUrl: './dashboardkpi.component.html',
  styleUrl: './dashboardkpi.component.scss',
  standalone: false,
})
export class DashboardkpiComponent {
  @Input() item: any;
}
