import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, ApiResponse } from '../../../services/api.service';
import { BreadcrumbService } from '../../../services/breadcrumb.service';
import { UtilsService } from '../../../services/utils.service';
import { formatDateOrPassThrough } from '../../../utils/date-format.util';
import {
  TableConfig,
  TableColumn,
} from '../../reusable/reusable-table/reusable-table.component';
import { SignalRService, TOPICS } from '../../../services/signalr.service';
import { Subject, takeUntil } from 'rxjs';

export interface PreviousPageMetadata {
  assetId: number;
}

export interface AssetControlPanelHeader {
  ministryId: number;
  assetUrl: string;
  assetName: string;
  ministry: string;
  department: string;
  citizenImpactLevel: string;
  currentHealth: string;
  riskExposureIndex: string;
  currentStatus: string;
  lastOutage: string;
  ownerName: string;
  ownerEmail: string;
  ownerContact: string;
  technicalOwnerName: string;
  technicalOwnerEmail: string;
  technicalOwnerContact: string;
}

export interface KPI {
  kpiId: number;
  kpiName: string;
  target: string;
  manual?: string;
  averageValue: string;
  currentValue: string;
  currentSlaStatus: string;
  averageSlaStatus: string;
  lastChecked: string;
  dataSource: string;
}

export interface KPICategory {
  categoryName: string;
  kpis: KPI[];
}

export interface AssetControlPanelData {
  header: AssetControlPanelHeader;
  kpiCategories: KPICategory[];
}

@Component({
  selector: 'app-asset-control-panel',
  templateUrl: './asset-control-panel.component.html',
  styleUrl: './asset-control-panel.component.scss',
  standalone: false,
})
export class AssetControlPanelComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  previousPageMetadata = signal<PreviousPageMetadata>({
    assetId: 0,
  });

  assetControlPanelData = signal<AssetControlPanelData | null>(null);

  /** Loading state for "Check All KPIs" button */
  checkAllKpisLoading = signal<boolean>(false);

  /** Cache table configs per category so the same reference is passed to reusable-table (fixes action click bindings). */
  private tableConfigCache = new Map<string, TableConfig>();

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    searchPlaceholder: '',
    serverSideSearch: false,
    defaultPage: 1,
    defaultPageSize: 10,
    emptyStateMessage: 'No KPI data available',
    columns: [
      {
        key: 'kpiName',
        header: 'KPI Name',
        cellType: 'text',
        primaryField: 'kpiName',
        sortable: false,
        width: '220px',
      },
      {
        key: 'target',
        header: 'Target',
        cellType: 'text',
        primaryField: 'target',
        sortable: false,
        width: '100px',
      },
      {
        key: 'averageValue',
        header: 'Average Value',
        cellType: 'text-with-color',
        primaryField: 'averageValue',
        sortable: false,
        width: '140px',
        textColor: (row: any) => this.getSlaStatusTextColor(row.averageSlaStatus),
      },
      {
        key: 'currentValue',
        header: 'Current Value',
        cellType: 'text-with-color',
        primaryField: 'currentValue',
        sortable: false,
        width: '140px',
        textColor: (row: any) => this.getSlaStatusTextColor(row.currentSlaStatus),
      },
      {
        key: 'lastChecked',
        header: 'Last Checked',
        cellType: 'text',
        primaryField: 'lastChecked',
        sortable: false,
        width: '120px',
      },
      {
        key: 'dataSource',
        header: 'Data Source',
        cellType: 'text',
        primaryField: 'dataSource',
        sortable: false,
        width: '120px',
      },
      {
        key: 'actions',
        header: 'Action',
        cellType: 'actions',
        sortable: false,
        width: '100px',
        actionLinks: [
          {
            label: 'Check',
            color: 'var(--color-primary)',
            display: 'text',
            showTooltip: false,
            disabled: (row: any) => String(row?.dataSource || '').toLowerCase() === 'manual',
          },
        ],
      },
    ],
    data: [],
  });

  getTableConfigForCategory(categoryName: string): TableConfig {
    const cached = this.tableConfigCache.get(categoryName);
    if (cached) return cached;

    const data = this.assetControlPanelData();
    if (!data) {
      const empty = { ...this.tableConfig(), data: [] };
      return empty;
    }

    const category = data.kpiCategories.find(
      (cat) => cat.categoryName === categoryName,
    );

    if (!category) {
      const empty = { ...this.tableConfig(), data: [] };
      return empty;
    }

    const processedData = category.kpis.map((kpi) => ({
      ...kpi,
      lastChecked: this.formatLastCheckedShort(kpi.lastChecked),
    }));
    const config: TableConfig = {
      ...this.tableConfig(),
      data: processedData,
    };
    this.tableConfigCache.set(categoryName, config);
    return config;
  }

  getTotalItemsForCategory(categoryName: string): number {
    const data = this.assetControlPanelData();
    if (!data) return 0;

    const category = data.kpiCategories.find(
      (cat) => cat.categoryName === categoryName,
    );

    return category ? category.kpis.length : 0;
  }

  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private api: ApiService,
    private utils: UtilsService,
    private signalR: SignalRService,
    private breadcrumbService: BreadcrumbService,
  ) {}

  ngOnInit(): void {
    // Fetch query parameters
    const assetId = this.activatedRoute.snapshot.queryParams['assetId'];
    const assetIdNum = Number(assetId);
    this.previousPageMetadata.set({
      assetId: assetIdNum,
    });

    if (!assetId) {
      this.utils.showToast('Asset ID is required', 'Error', 'error');
      this.route.navigate(['/dashboard']);
      return;
    }

    this.loadAssetData();

    const controlPanelTopic = TOPICS.assetControlPanel(assetId);
    const kpisLovTopic = TOPICS.assetKpisLov(assetId);
    this.signalR.joinTopic(controlPanelTopic).catch(() => {});
    this.signalR.joinTopic(kpisLovTopic).catch(() => {});
    this.signalR.onDataUpdated.pipe(takeUntil(this.destroy$)).subscribe((topic) => {
      if (topic === controlPanelTopic || topic === kpisLovTopic) {
        this.loadAssetData();
      }
    });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setCurrentLabel(null);
    this.destroy$.next();
    this.destroy$.complete();
    const assetId = this.previousPageMetadata().assetId;
    if (assetId) {
      this.signalR.leaveTopic(TOPICS.assetControlPanel(assetId)).catch(() => {});
      this.signalR.leaveTopic(TOPICS.assetKpisLov(assetId)).catch(() => {});
    }
  }

  loadAssetData(): void {
    this.tableConfigCache.clear();
    this.api.getAssetControlPanelData(this.previousPageMetadata().assetId).subscribe({
      next: (response: ApiResponse<AssetControlPanelData>) => {
        if (response.isSuccessful) {
          this.tableConfigCache.clear();
          this.assetControlPanelData.set(response.data as AssetControlPanelData);
          const name = (response.data as AssetControlPanelData)?.header?.assetName;
          if (name) this.breadcrumbService.setCurrentLabel(name);
        } else {
          this.utils.showToast(response.message || 'Failed to load asset data', 'Error', 'error');
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error loading asset data', 'error');
        this.route.navigate(['/dashboard']);
      }
    });
  }

  /** Format last outage: short form for relative times ("5 mins ago", "2 days ago"), else date or pass-through. */
  formatLastOutage(value: string | null | undefined): string {
    if (value == null || value === '') return 'N/A';
    const formatted = formatDateOrPassThrough(value);
    if (formatted !== value) return formatted;
    return String(value)
      .replace(/\b1 minute ago\b/gi, '1 min ago')
      .replace(/\b(\d+) minutes ago\b/gi, '$1 mins ago')
      .replace(/\b1 hour ago\b/gi, '1 hr ago')
      .replace(/\b(\d+) hours ago\b/gi, '$1 hrs ago')
      .replace(/\bJust now\b/gi, 'just now');
  }

  /** Format last checked for table: short form ("5 mins ago", "2 hrs ago", "just now"). */
  private formatLastCheckedShort(checked: string | null | undefined): string {
    if (checked == null || checked === '') return 'N/A';
    const raw = String(checked).trim();
    const toShortForm = (s: string) =>
      s
        .replace(/\b1 minute ago\b/gi, '1 min ago')
        .replace(/\b(\d+) minutes ago\b/gi, '$1 mins ago')
        .replace(/\b(\d+) minute ago\b/gi, '$1 mins ago')
        .replace(/\b1 hour ago\b/gi, '1 hr ago')
        .replace(/\b(\d+) hours ago\b/gi, '$1 hrs ago')
        .replace(/\b(\d+) hour ago\b/gi, '$1 hrs ago')
        .replace(/\b1 day ago\b/gi, '1 day ago')
        .replace(/\b(\d+) days ago\b/gi, '$1 days ago')
        .replace(/\bJust now\b/gi, 'just now');
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return toShortForm(raw);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      let out: string;
      if (diffDays > 0) out = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      else if (diffHours > 0) out = diffHours === 1 ? '1 hr ago' : `${diffHours} hrs ago`;
      else if (diffMinutes > 0) out = diffMinutes === 1 ? '1 min ago' : `${diffMinutes} mins ago`;
      else out = 'just now';
      return toShortForm(out);
    } catch {
      return toShortForm(raw);
    }
  }

  getBadgeColor(
    value: string | undefined | null,
    type: 'citizenImpact' | 'health' | 'risk',
  ): string {
    if (!value) return 'var(--color-bg-quaternary)';

    const upperValue = value.toUpperCase();

    // Check for unknown status
    if (upperValue.includes('UNKNOWN') || upperValue.includes('N/A')) {
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'citizenImpact') {
      if (upperValue.includes('LOW')) return 'var(--color-green-light)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow-light)';
      if (upperValue.includes('HIGH')) return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'health') {
      if (upperValue.includes('GOOD') || upperValue.includes('EXCELLENT'))
        return 'var(--color-green-light)';
      if (upperValue.includes('AVERAGE') || upperValue.includes('FAIR'))
        return 'var(--color-yellow-light)';
      if (upperValue.includes('POOR') || upperValue.includes('CRITICAL'))
        return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'risk') {
      if (upperValue.includes('LOW')) return 'var(--color-green-light)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow-light)';
      if (upperValue.includes('HIGH')) return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    return 'var(--color-bg-quaternary)';
  }

  getBadgeTextColor(
    value: string | undefined | null,
    type: 'citizenImpact' | 'health' | 'risk',
  ): string {
    if (!value) return 'var(--color-text-tertiary)';

    const upperValue = value.toUpperCase();

    // Check for unknown status
    if (upperValue.includes('UNKNOWN') || upperValue.includes('N/A')) {
      return 'var(--color-text-tertiary)';
    }

    if (type === 'citizenImpact') {
      if (upperValue.includes('LOW')) return 'var(--color-green-dark)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow)';
      if (upperValue.includes('HIGH')) return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    if (type === 'health') {
      if (upperValue.includes('GOOD') || upperValue.includes('EXCELLENT'))
        return 'var(--color-green-dark)';
      if (upperValue.includes('AVERAGE') || upperValue.includes('FAIR'))
        return 'var(--color-yellow)';
      if (upperValue.includes('POOR') || upperValue.includes('CRITICAL'))
        return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    if (type === 'risk') {
      if (upperValue.includes('LOW')) return 'var(--color-green-dark)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow)';
      if (upperValue.includes('HIGH')) return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    return 'var(--color-text-tertiary)';
  }

  getBadgeClass(badgeColor?: string): string {
    if (!badgeColor) return 'badge-success';

    // Extract color name from CSS variable to determine badge class
    if (badgeColor.includes('green')) return 'badge-success';
    if (badgeColor.includes('red')) return 'badge-danger';
    if (badgeColor.includes('yellow')) return 'badge-warning';

    return 'badge-success';
  }

  /** Dashboard-style badge class for header badges (pill + glass, same as dashboard). */
  getHeaderBadgeStatusClass(value: string | undefined | null, type: 'citizenImpact' | 'health' | 'risk'): string {
    if (!value) return 'badge-status-unknown';
    const upperValue = String(value).trim().toUpperCase();

    if (type === 'citizenImpact') {
      if (upperValue.includes('LOW')) return 'badge-status-success';
      if (upperValue.includes('MEDIUM')) return 'badge-status-warning';
      if (upperValue.includes('HIGH')) return 'badge-status-danger';
      return 'badge-status-unknown';
    }
    if (type === 'health') {
      if (upperValue.includes('GOOD') || upperValue.includes('EXCELLENT') || upperValue.includes('HEALTHY') || upperValue.includes('HIGH'))
        return 'badge-status-success';
      if (upperValue.includes('AVERAGE') || upperValue.includes('FAIR') || upperValue.includes('MODERATE') || upperValue.includes('MEDIUM')) return 'badge-status-warning';
      if (upperValue.includes('POOR') || upperValue.includes('CRITICAL') || upperValue.includes('LOW')) return 'badge-status-danger';
      return 'badge-status-unknown';
    }
    if (type === 'risk') {
      if (upperValue.includes('LOW')) return 'badge-status-success';
      if (upperValue.includes('MEDIUM')) return 'badge-status-warning';
      if (upperValue.includes('HIGH')) return 'badge-status-danger';
      return 'badge-status-unknown';
    }
    return 'badge-status-unknown';
  }

  /** Value text color class for metrics panel (value-success, value-warning, value-danger, value-unknown). */
  getHeaderValueClass(value: string | undefined | null, type: 'citizenImpact' | 'health' | 'risk' | 'status'): string {
    const badge = type === 'status' ? this.getCurrentStatusBadgeClass(value) : this.getHeaderBadgeStatusClass(value, type);
    if (badge === 'badge-status-success') return 'value-success';
    if (badge === 'badge-status-warning') return 'value-warning';
    if (badge === 'badge-status-danger') return 'value-danger';
    return 'value-unknown';
  }

  /** Resolved color for Current Health (so it always shows even if CSS is overridden). */
  getCurrentHealthColor(value: string | undefined | null): string {
    const badge = this.getHeaderBadgeStatusClass(value, 'health');
    if (badge === 'badge-status-success') return 'var(--color-green, #10b981)';
    if (badge === 'badge-status-warning') return 'var(--color-orange, #f59e0b)';
    if (badge === 'badge-status-danger') return 'var(--color-red, #dc2626)';
    return 'rgba(255, 255, 255, 0.65)';
  }

  /** Display text for metric (capitalized, e.g. first part before '-'). */
  getHeaderDisplayValue(value: string | undefined | null, _type: string): string {
    if (!value) return 'Unknown';
    const part = value.split('-')[0]?.trim() || value;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }

  /** Indicator for metric: 'up' | 'down' for citizen/risk (arrow). */
  getMetricIndicator(value: string | undefined | null, type: 'citizenImpact' | 'risk'): 'up' | 'down' | null {
    if (!value) return null;
    const u = String(value).trim().toUpperCase();
    if (type === 'citizenImpact') {
      if (u.includes('HIGH')) return 'up';
      if (u.includes('LOW')) return 'down';
      return null;
    }
    if (type === 'risk') {
      if (u.includes('HIGH')) return 'up';
      if (u.includes('LOW')) return 'down';
      if (u.includes('MEDIUM')) return 'down'; // show down arrow for medium so icon is never missing
      return null;
    }
    return null;
  }

  /** Dashboard-style badge class for CURRENT STATUS (UP/ONLINE = success, DOWN/OFFLINE = danger, etc.). */
  getCurrentStatusBadgeClass(status: string | undefined | null): string {
    if (!status) return 'badge-status-unknown';
    const s = String(status).toUpperCase();
    if (s.includes('UP') || s.includes('ONLINE')) return 'badge-status-success';
    if (s.includes('DOWN') || s.includes('OFFLINE')) return 'badge-status-danger';
    if (s.includes('WARNING') || s.includes('PARTIAL') || s.includes('DEGRADED')) return 'badge-status-warning';
    return 'badge-status-unknown';
  }

  getStatusBoxClass(status: string | undefined | null): string {
    if (!status) return 'bg-transparent border border-secondary';

    const upperStatus = status.toUpperCase();
    if (upperStatus.includes('DOWN') || upperStatus.includes('OFFLINE')) {
      return 'bg-danger-subtle border border-danger';
    }
    if (upperStatus.includes('UP') || upperStatus.includes('ONLINE')) {
      return 'bg-success-subtle border border-success';
    }
    return 'bg-transparent border border-secondary';
  }

  getStatusTextClass(status: string | undefined | null): string {
    if (!status) return 'text-secondary';

    const upperStatus = status.toUpperCase();
    if (upperStatus.includes('DOWN') || upperStatus.includes('OFFLINE')) {
      return 'text-danger';
    }
    if (upperStatus.includes('UP') || upperStatus.includes('ONLINE')) {
      return 'text-success';
    }
    return 'text-secondary';
  }

  /** Dashboard-style badge status for SLA column (pill + glass). */
  getSlaBadgeStatus(slaStatus: string | undefined | null): 'success' | 'danger' | 'warning' | 'info' | 'unknown' {
    if (!slaStatus) return 'unknown';
    const upperStatus = slaStatus.toUpperCase().trim();
    if (upperStatus.includes('NON-COMPLIANT')) return 'danger';
    if (upperStatus.includes('COMPLIANT')) return 'success';
    if (upperStatus.includes('UNKNOWN') || upperStatus.includes('N/A')) return 'unknown';
    return 'unknown';
  }

  /** Text color for Average Value / Current Value: COMPLIANT=green, NON-COMPLIANT=red, UNKNOWN=black. */
  getSlaStatusTextColor(status: string | undefined | null): 'success' | 'danger' | 'unknown' {
    if (!status) return 'unknown';
    const upper = String(status).toUpperCase().trim();
    if (upper.includes('COMPLIANT') && !upper.includes('NON-')) return 'success';
    if (upper.includes('NON-COMPLIANT')) return 'danger';
    return 'unknown';
  }

  onCheckAllKpis(): void {
    const assetId = this.previousPageMetadata().assetId;
    if (!assetId) {
      this.utils.showToast('Asset ID is required.', 'Check All KPIs', 'error');
      return;
    }
    this.checkAllKpisLoading.set(true);
    this.api.checkAllKpisFromAsset(assetId).subscribe({
      next: (res) => {
        this.checkAllKpisLoading.set(false);
        const msg = res?.message ?? res?.data?.message ?? 'All KPIs check completed successfully.';
        this.utils.showToast(msg, 'Check All KPIs', res?.isSuccessful !== false ? 'success' : 'error');
        this.loadAssetData();
      },
      error: (err) => {
        this.checkAllKpisLoading.set(false);
        const msg = err?.error?.message ?? err?.message ?? 'Check all KPIs failed.';
        this.utils.showToast(msg, 'Check All KPIs', 'error');
      },
    });
  }

  onCheckClick(row: any): void {
    const assetId = this.previousPageMetadata().assetId;
    const kpiId = row?.kpiId;
    if (!assetId || kpiId == null) {
      this.utils.showToast('Invalid asset or KPI.', 'Check', 'error');
      return;
    }
    this.api.manualCheckFromAsset(assetId, Number(kpiId)).subscribe({
      next: (res) => {
        const msg =
          res?.data?.message ??
          res?.message ??
          'Manual check completed successfully.';
        this.utils.showToast(msg, 'Check', 'success');
        this.loadAssetData();
      },
      error: (err) => {
        const msg =
          err?.error?.message ??
          err?.error ??
          err?.message ??
          'Manual check failed.';
        this.utils.showToast(msg, 'Check', 'error');
      },
    });
  }

  onActionClick(event: { row: any; columnKey: string }): void {
    const { row, columnKey } = event;
    if (columnKey === 'Check') {
      this.onCheckClick(row);
    }
  }
}
