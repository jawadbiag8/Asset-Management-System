import { Component, Input } from '@angular/core';

export interface DashboardKpiItem {
  id: number;
  title: string;
  subTitle: string;
  value: string;
  subValue?: string;
  subValueColor?: 'success' | 'danger' | '';
  subValueText: string;
  subValueLink?: string; // Link URL from parent component
}

@Component({
  selector: 'app-dashboardkpi',
  templateUrl: './dashboardkpi.component.html',
  styleUrl: './dashboardkpi.component.scss',
  standalone: false,
})
export class DashboardkpiComponent {
  @Input() item!: DashboardKpiItem;

  isPercentageBadge(): boolean {
    if (!this.item.subValue) return false;
    return !!(this.item.subValue.includes('%') || this.item.subValue.match(/^\d+%$/));
  }

  getBadgeClass(): string {
    if (!this.item.subValue) return '';

    const isPercentage = this.isPercentageBadge();
    if (isPercentage) {
      return this.item.subValueColor === 'success' ? 'kpi-badge-percentage kpi-badge-success' : 'kpi-badge-percentage kpi-badge-danger';
    } else {
      // Text badges like HEALTHY, AVERAGE, LOW, MEDIUM
      const badgeText = this.item.subValue.toUpperCase();
      if (badgeText === 'HEALTHY') {
        return 'kpi-badge-text kpi-badge-healthy';
      } else if (badgeText === 'AVERAGE') {
        return 'kpi-badge-text kpi-badge-average';
      } else if (badgeText === 'LOW') {
        return 'kpi-badge-text kpi-badge-low';
      } else if (badgeText === 'MEDIUM') {
        return 'kpi-badge-text kpi-badge-medium';
      }
      return this.item.subValueColor === 'success' ? 'kpi-badge-text kpi-badge-success' : 'kpi-badge-text kpi-badge-danger';
    }
  }
}
