import {
  Component,
  OnInit,
  signal,
  HostListener,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import { ApiService, ApiResponse } from '../../services/api.service';
import type { FilterOption } from '../reusable/reusable-table/reusable-table.component';
import { DASHBOARD_FILTER_MENU, FilterOptionsService } from '../../services/filter-options.service';

export interface MinistrySummary {
  ministryId: string;
  ministryName: string;
  departmentCount: number;
  assetCount: number;
  openIncidents: number;
}

export interface AssetTile {
  id: number;
  assetUrl: string;
  assetName: string;
  currentStatus: string;
  /** Number shown bottom-left; null shows (--) */
  tileValue: number | null;
}

@Component({
  selector: 'app-ministry-dashboard',
  templateUrl: './ministry-dashboard.component.html',
  styleUrl: './ministry-dashboard.component.scss',
  standalone: false,
})
export class MinistryDashboardComponent implements OnInit {
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  searchTerm = signal<string>('');
  ministries = signal<MinistrySummary[]>([]);
  totalCount = signal<number>(0);
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);

  /** Page size options for dropdown (same as table). */
  readonly pageSizeOptions = [5, 10, 25, 50, 100];

  /** ministryId -> assets (from ministrydetails API, no separate load) */
  assetsByMinistry = signal<Record<string, AssetTile[]>>({});
  /** Set of ministryIds that are currently expanded (accordion open) */
  expandedIds = signal<Set<string>>(new Set<string>());

  /** Selected filter values (same param keys as dashboard). Only status is used for asset filtering on this page. */
  selectedStatus = signal<string>('');
  selectedMinistry = signal<string>('');
  selectedHealth = signal<string>('');
  selectedPerformance = signal<string>('');
  selectedCompliance = signal<string>('');
  selectedRiskIndex = signal<string>('');
  selectedCitizenImpact = signal<string>('');

  /** Filter menu: open state and which filter's options are shown on the right. */
  filterMenuOpen = signal<boolean>(false);
  activeFilterId = signal<string | null>(null);

  /** Button title: starts as first filter label, updates when filter or option is clicked. */
  filterButtonTitle = signal<string>('');

  /** Which filter's options are shown beside the button (persists when dropdown closes). */
  currentFilterId = signal<string>('');

  /** Same filters as dashboard except Ministry (not needed on ministry page). */
  readonly menuFilters = DASHBOARD_FILTER_MENU.filter((f) => f.id !== 'ministry');

  constructor(
    private apiService: ApiService,
    private router: Router,
    private filterOptions: FilterOptionsService,
  ) {}

  ngOnInit(): void {
    this.filterOptions.loadFilterOptions().subscribe();
    this.loadMinistryDetails();
    const firstId = this.menuFilters[0]?.id ?? 'status';
    this.currentFilterId.set(firstId);
    this.filterButtonTitle.set(this.getFilterDisplayLabel(this.menuFilters[0]?.id ?? '') || 'Status');
  }

  /** Toggle filter menu (dropdown); right-aligned. */
  toggleFilterMenu(): void {
    this.filterMenuOpen.update((v) => !v);
    if (this.filterMenuOpen()) {
      this.activeFilterId.set((this.currentFilterId() || this.menuFilters[0]?.id) ?? null);
    } else {
      this.activeFilterId.set(null);
    }
  }

  /** Close menu when clicking outside. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.filterMenuOpen() && target && !target.closest('.filter-menu-host')) {
      this.filterMenuOpen.set(false);
      this.activeFilterId.set(null);
    }
  }

  /** Select which filter's options to show; update button title and options beside button. */
  setActiveFilter(filterId: string): void {
    this.activeFilterId.set(filterId);
    this.currentFilterId.set(filterId);
    const label = this.getFilterDisplayLabel(filterId);
    if (label) this.filterButtonTitle.set(label);
  }

  /** Display label for filter (e.g. "Digital Experience" for citizenImpact). */
  private getFilterDisplayLabel(filterId: string): string {
    const f = this.menuFilters.find((m) => m.id === filterId);
    if (f?.id === 'citizenImpact') return 'Digital Experience';
    return f?.label ?? '';
  }

  /** Get options for the active filter — shown in dropdown. */
  getActiveFilterOptions(): FilterOption[] {
    return this.getOptionsForFilterId(this.activeFilterId());
  }

  /** Apply selected option (from dropdown or from options beside button); always refresh list. */
  applyFilterOption(value: string, filterId?: string): void {
    const id = (filterId ?? this.activeFilterId()) || this.currentFilterId();
    if (id) this.currentFilterId.set(id);
    const activeLabel = this.getFilterDisplayLabel(id);
    const opts = this.getOptionsForFilterId(id);
    const opt = opts.find((o) => o.value === value);
    const optionLabel = opt?.label ?? value;
    if (optionLabel) {
      this.filterButtonTitle.set(activeLabel ? `${activeLabel}: ${optionLabel}` : optionLabel);
    } else {
      this.filterButtonTitle.set(activeLabel);
    }
    switch (id) {
      case 'ministry': this.selectedMinistry.set(value); break;
      case 'status':
        this.selectedStatus.set(value);
        this.clearOtherFiltersExceptStatus();
        break;
      case 'health': this.selectedHealth.set(value); break;
      case 'performance': this.selectedPerformance.set(value); break;
      case 'compliance': this.selectedCompliance.set(value); break;
      case 'riskIndex': this.selectedRiskIndex.set(value); break;
      case 'citizenImpact': this.selectedCitizenImpact.set(value); break;
    }
    this.filterMenuOpen.set(false);
    this.activeFilterId.set(null);
    this.pageIndex.set(0);
    this.loadMinistryDetails();
  }

  /** When status is selected, clear other filter values so API gets only status. */
  private clearOtherFiltersExceptStatus(): void {
    this.selectedHealth.set('');
    this.selectedPerformance.set('');
    this.selectedCompliance.set('');
    this.selectedRiskIndex.set('');
    this.selectedCitizenImpact.set('');
  }

  /** Options for a given filter id (for dropdown and for beside-button list). */
  getOptionsForFilterId(filterId: string | null): FilterOption[] {
    const empty: FilterOption[] = [{ label: 'All', value: '' }];
    if (!filterId) return empty;
    switch (filterId) {
      case 'ministry': return this.filterOptions.ministryOptions().length ? this.filterOptions.ministryOptions() : empty;
      case 'status': return this.filterOptions.statusOptions().length ? this.filterOptions.statusOptions() : empty;
      case 'health': return this.filterOptions.healthOptions().length ? this.filterOptions.healthOptions() : empty;
      case 'performance': return this.filterOptions.performanceOptions().length ? this.filterOptions.performanceOptions() : empty;
      case 'compliance': return this.filterOptions.complianceOptions().length ? this.filterOptions.complianceOptions() : empty;
      case 'riskIndex': return this.filterOptions.riskIndexOptions().length ? this.filterOptions.riskIndexOptions() : empty;
      case 'citizenImpact': return [
        { label: 'All', value: '' },
        { label: 'HIGH', value: 'High' },
        { label: 'MEDIUM', value: 'Average' },
        { label: 'LOW', value: 'Poor' },
      ];
      default: return empty;
    }
  }

  /** Options to show beside the button (for current filter). */
  getOptionsBesideButton(): FilterOption[] {
    return this.getOptionsForFilterId(this.currentFilterId());
  }

  /** Selected value for the current filter (to highlight beside button). */
  getSelectedValueForCurrentFilter(): string {
    const id = this.currentFilterId();
    switch (id) {
      case 'ministry': return this.selectedMinistry();
      case 'status': return this.selectedStatus();
      case 'health': return this.selectedHealth();
      case 'performance': return this.selectedPerformance();
      case 'compliance': return this.selectedCompliance();
      case 'riskIndex': return this.selectedRiskIndex();
      case 'citizenImpact': return this.selectedCitizenImpact();
      default: return '';
    }
  }

  clearStatusFilter(): void {
    this.selectedStatus.set('');
    this.pageIndex.set(0);
    this.loadMinistryDetails();
  }

  /** Label for the selected status pill (e.g. 'UP'). */
  getSelectedStatusLabel(): string {
    const value = this.selectedStatus();
    if (!value) return '';
    const option = this.filterOptions.statusOptions().find((o) => o.value === value);
    return option?.label ?? value;
  }

  /** Badge class for the selected status pill — same as existing status badges (Up→green, Down→red, etc.). */
  getSelectedStatusBadgeClass(): string {
    return this.statusBadgeClass(this.selectedStatus() || '');
  }

  /** Return assets for a ministry filtered by selected Current Status. */
  /** Assets to show in accordion. Only filter by status when current filter is Status; else show API response as-is. */
  getFilteredAssets(ministryId: string): AssetTile[] {
    const assets = this.getAssets(ministryId);
    if (this.currentFilterId() !== 'status') return assets;
    const status = this.selectedStatus();
    if (!status) return assets;
    const normalized = status.toUpperCase();
    return assets.filter((a) => (a.currentStatus || 'UNKNOWN').toUpperCase() === normalized);
  }

  /** API filterType names (ministrydetails API). Status also uses filterType/filterValue, not a separate status param. */
  private static readonly API_FILTER_TYPES: Record<string, string> = {
    status: 'Status',
    health: 'CurrentHealth',
    performance: 'PerformanceIndex',
    compliance: 'OverallComplianceMetric',
    riskIndex: 'DigitalRiskExposureIndex',
    citizenImpact: 'CitizenHappinessMetric',
  };

  private getApiFilterType(filterId: string): string {
    return MinistryDashboardComponent.API_FILTER_TYPES[filterId] ?? filterId;
  }

  /** Map our LOV option values to API filterValue: High / Average / Poor / Unknown. */
  private mapToApiFilterValue(ourValue: string): string {
    if (!ourValue) return '';
    const v = ourValue.toLowerCase().trim();
    // Match first word / phrase so "LOW - Supporting Services", "MEDIUM - Important Services" etc. work
    if (v.startsWith('high') && !v.includes('high risk')) return 'High';
    if (v === 'healthy' || v === 'good' || v === 'high compliance') return 'High';
    if (v.startsWith('medium') || v.startsWith('average') || v === 'fair' || v === 'medium compliance' || v === 'medium risk') return 'Average';
    if (v.startsWith('low') || v === 'poor' || v === 'critical' || v === 'below average' || v === 'low compliance' || v.includes('high risk')) return 'Poor';
    return 'Unknown';
  }

  /**
   * Load ministries + assets from ministrydetails API.
   * Call only on: page init, filter apply, search, pagination, clear filter.
   * Do NOT call on accordion expand — data is already in assetsByMinistry.
   */
  loadMinistryDetails(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const pageNumber = this.pageIndex() + 1;
    const pageSize = this.pageSize();
    const searchTerm = this.searchTerm()?.trim() || '';

    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }

    // Status and other filters all use filterType + filterValue (no separate status param).
    let filterType = this.getFilterTypeForApi();
    let filterValue = this.getFilterValueForApi();
    // When current filter is status but nothing selected, default to Status / ALL.
    if (this.currentFilterId() === 'status' && !filterValue) {
      filterType = 'Status';
      filterValue = 'ALL';
    }
    if (filterType && filterValue) {
      params = params.set('filterType', filterType).set('filterValue', filterValue);
    }

    this.apiService.getMinistryDetails(params).subscribe({
      next: (response: ApiResponse<any>) => {
        this.loading.set(false);
        if (response.isSuccessful && response.data) {
          const payload = response.data;
          const list = Array.isArray(payload?.data) ? payload.data : [];
          const total = payload?.totalCount ?? 0;

          const summaries: MinistrySummary[] = [];
          const assetsMap: Record<string, AssetTile[]> = {};

          list.forEach((item: any) => {
            const mid = (item.ministryId ?? item.id)?.toString() ?? '';
            summaries.push({
              ministryId: mid,
              ministryName: item.ministryName ?? item.name ?? 'N/A',
              departmentCount: item.numberOfDepartments ?? item.departmentCount ?? 0,
              assetCount: item.numberOfAssets ?? item.assetCount ?? 0,
              openIncidents: item.openIncidentCount ?? item.openIncidents ?? 0,
            });
            const assetsList = Array.isArray(item.assets) ? item.assets : [];
            assetsMap[mid] = assetsList.map((a: any) => ({
              id: a.assetId ?? a.id ?? 0,
              assetUrl: a.assetUrl ?? '',
              assetName: a.assetName ?? a.name ?? a.assetUrl ?? 'N/A',
              currentStatus: (a.currentStatus ?? a.status ?? 'UNKNOWN').toUpperCase(),
              tileValue: a.openIncidentCount != null ? Number(a.openIncidentCount) : null,
            }));
          });

          this.ministries.set(summaries);
          this.assetsByMinistry.set(assetsMap);
          this.totalCount.set(total);
        } else {
          this.errorMessage.set(response.message ?? 'Failed to load ministry details');
          this.ministries.set([]);
          this.assetsByMinistry.set({});
          this.totalCount.set(0);
        }
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Error loading ministry details. Please try again.');
        this.ministries.set([]);
        this.assetsByMinistry.set({});
        this.totalCount.set(0);
      },
    });
  }

  /** API filterType from currently active filter only (status uses filterType=Status, not status param). */
  private getFilterTypeForApi(): string {
    const id = this.currentFilterId();
    if (!id) return '';
    if (!this.getSelectedValueForCurrentFilter()) return '';
    return this.getApiFilterType(id);
  }

  /** API filterValue: for status use value as-is (ALL/Up/Down); for others map to High/Average/Poor/Unknown. */
  private getFilterValueForApi(): string {
    const id = this.currentFilterId();
    const raw = this.getSelectedValueForCurrentFilter();
    if (!raw) return '';
    if (id === 'status') return raw; // ALL, Up, Down as-is
    let mapped = this.mapToApiFilterValue(raw);
    // If value is LOV id (e.g. "1") and mapped to Unknown, try mapping by option label (e.g. "LOW - Supporting Services")
    if (mapped === 'Unknown') {
      const opts = this.getOptionsForFilterId(id);
      const option = opts.find((o) => o.value === raw || String(o.value) === raw);
      if (option?.label) mapped = this.mapToApiFilterValue(option.label);
    }
    return mapped;
  }

  isExpanded(ministryId: string): boolean {
    return this.expandedIds().has(ministryId);
  }

  /** Accordion expand/collapse only — no API call; assets already in assetsByMinistry from loadMinistryDetails. */
  toggleAccordion(ministryId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const current = new Set(this.expandedIds());
    if (current.has(ministryId)) {
      current.delete(ministryId);
    } else {
      current.add(ministryId);
    }
    this.expandedIds.set(current);
  }

  /** Read assets from in-memory map (from ministrydetails response); no HTTP. */
  getAssets(ministryId: string): AssetTile[] {
    return this.assetsByMinistry()[ministryId] ?? [];
  }

  statusBadgeClass(status: string): string {
    const s = (status || 'UNKNOWN').toUpperCase();
    if (s === 'UP' || s === 'ONLINE') return 'status-up';
    if (s === 'DOWN' || s === 'OFFLINE') return 'status-down';
    if (s === 'WARNING' || s === 'PARTIAL' || s === 'DEGRADED') return 'status-warning';
    return 'status-unknown';
  }

  /** Tile background class by status (for whole-tile tint) */
  tileBgClass(status: string): string {
    const s = (status || 'UNKNOWN').toUpperCase();
    if (s === 'UP' || s === 'ONLINE') return 'tile-bg-up';
    if (s === 'DOWN' || s === 'OFFLINE') return 'tile-bg-down';
    if (s === 'WARNING' || s === 'PARTIAL' || s === 'DEGRADED') return 'tile-bg-warning';
    return 'tile-bg-unknown';
  }

  formatTileValue(value: number | null): string {
    if (value == null) return '--';
    return value >= 0 && value <= 99 ? value.toString().padStart(2, '0') : String(value);
  }

  /** Bottom-left value text color class by status */
  valueColorClass(status: string): string {
    const s = (status || 'UNKNOWN').toUpperCase();
    if (s === 'UP' || s === 'ONLINE') return 'value-up';
    if (s === 'DOWN' || s === 'OFFLINE') return 'value-down';
    if (s === 'WARNING' || s === 'PARTIAL' || s === 'DEGRADED') return 'value-warning';
    return 'value-unknown';
  }

  goToMinistryDetail(ministryId: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.router.navigate(['/ministry-detail'], {
      queryParams: { ministryId },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
    this.loadMinistryDetails();
  }

  onPageChange(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.loadMinistryDetails();
  }

  onPageSizeChange(value: number): void {
    this.pageSize.set(value);
    this.pageIndex.set(0);
    this.loadMinistryDetails();
  }

  generateReport(ministryId: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    // Placeholder: could open report modal or navigate to report page
  }

  paginationStart(): number {
    const total = this.totalCount();
    const size = this.pageSize();
    const page = this.pageIndex();
    return total === 0 ? 0 : page * size + 1;
  }

  paginationEnd(): number {
    const total = this.totalCount();
    const size = this.pageSize();
    const page = this.pageIndex();
    return Math.min((page + 1) * size, total);
  }
}
