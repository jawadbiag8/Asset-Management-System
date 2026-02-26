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
    return !!(
      this.item.scrollToId ||
      this.item.subValueLink ||
      this.item.filterOnClick
    );
  }

  isPercentageBadge(): boolean {
    if (!this.item.subValue) return false;
    return !!(
      this.item.subValue.includes('%') || this.item.subValue.match(/^\d+%$/)
    );
  }

  /** Handle whole-card click: emit to parent if scrollToId (so filters clear + apply); else navigate. */
  onCardClick(event: Event): void {
    if (!this.isClickable) return;
    event.preventDefault();
    if (this.item.scrollToId) {
      this.cardAction.emit({
        scrollToId: this.item.scrollToId,
        filterOnClick: this.item.filterOnClick,
      });
    } else if (this.item.subValueLink) {
      this.router.navigateByUrl(this.item.subValueLink);
    }
  }

  /** Returns global status badge class (from styles.scss) so all badges use same color scheme & 24px radius. */
  getBadgeClass(): string {
    if (!this.item.subValue) return 'badge-status-unknown';

    const isPercentage = this.isPercentageBadge();
    if (isPercentage) {
      return this.item.subValueColor === 'success'
        ? 'badge-status-success'
        : 'badge-status-danger';
    }
    // Text badges: HEALTHY, AVERAGE, LOW, MEDIUM, HIGH, FAIR, etc.
    const badgeText = this.item.subValue.toUpperCase();
    if (badgeText === 'HEALTHY' || badgeText === 'FAIR') return 'badge-status-success';
    if (badgeText === 'AVERAGE') return 'badge-status-warning';
    if (badgeText === 'LOW' || badgeText === 'HIGH') return 'badge-status-danger';
    if (badgeText === 'MEDIUM') return 'badge-status-info';
    return this.item.subValueColor === 'success'
      ? 'badge-status-success'
      : this.item.subValueColor === 'danger'
        ? 'badge-status-danger'
        : 'badge-status-unknown';
  }
}
