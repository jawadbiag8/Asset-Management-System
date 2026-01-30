import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

export interface DashboardKpiItem {
  id: number;
  title: string;
  subTitle: string;
  value: string;
  subValue?: string;
  subValueColor?: 'success' | 'danger' | '';
  subValueText: string;
  subValueLink?: string; // Link URL from parent component
  /** When set, card click scrolls to this element id instead of navigating. */
  scrollToId?: string;
  /** When set, card click asks parent to apply this filter, then scroll (e.g. currentStatus=Up). */
  filterOnClick?: { paramKey: string; value: string };
}

export interface KpiCardAction {
  scrollToId?: string;
  subValueLink?: string;
  filterOnClick?: { paramKey: string; value: string };
}

@Component({
  selector: 'app-dashboardkpi',
  templateUrl: './dashboardkpi.component.html',
  styleUrls: ['./dashboardkpi.component.scss'],
  standalone: false,
})
export class DashboardkpiComponent {
  @Input() item!: DashboardKpiItem;
  @Output() cardAction = new EventEmitter<KpiCardAction>();

  constructor(private router: Router) {}

  get isClickable(): boolean {
    return !!(this.item.scrollToId || this.item.subValueLink || this.item.filterOnClick);
  }

  isPercentageBadge(): boolean {
    if (!this.item.subValue) return false;
    return !!(this.item.subValue.includes('%') || this.item.subValue.match(/^\d+%$/));
  }

  /** Handle whole-card click: emit to parent if filterOnClick; else scroll or navigate. */
  onCardClick(event: Event): void {
    if (!this.isClickable) return;
    event.preventDefault();
    if (this.item.filterOnClick) {
      this.cardAction.emit({
        scrollToId: this.item.scrollToId,
        filterOnClick: this.item.filterOnClick,
      });
    } else if (this.item.scrollToId) {
      document.getElementById(this.item.scrollToId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (this.item.subValueLink) {
      this.router.navigateByUrl(this.item.subValueLink);
    }
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
