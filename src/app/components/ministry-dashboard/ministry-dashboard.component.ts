import {
  Component,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import { ApiService, ApiResponse } from '../../services/api.service';

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
  pageSize = signal<number>(8);
  pageIndex = signal<number>(0);

  /** ministryId -> assets for that ministry (lazy-loaded when accordion opens) */
  assetsByMinistry = signal<Record<string, AssetTile[]>>({});
  /** ministryId -> loading state for assets */
  assetsLoadingByMinistry = signal<Record<string, boolean>>({});
  /** Set of ministryIds that are currently expanded (accordion open) */
  expandedIds = signal<Set<string>>(new Set<string>());

  constructor(
    private apiService: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadMinistries();
  }

  loadMinistries(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const params = new HttpParams()
      .set('PageNumber', String(this.pageIndex() + 1))
      .set('PageSize', String(this.pageSize()))
      .set('SearchTerm', this.searchTerm() || '');

    this.apiService.getMinistries(params).subscribe({
      next: (response: ApiResponse<any>) => {
        this.loading.set(false);
        if (response.isSuccessful && response.data) {
          const data =
            response.data.items ?? response.data.data ?? response.data;
          const total =
            response.data.totalCount ??
            response.data.total ??
            (Array.isArray(data) ? data.length : 0);

          const list = Array.isArray(data) ? data : [];
          this.ministries.set(this.transformMinistries(list));
          this.totalCount.set(total);
        } else {
          this.errorMessage.set(response.message ?? 'Failed to load ministries');
          this.ministries.set([]);
          this.totalCount.set(0);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('Error loading ministries. Please try again.');
        this.ministries.set([]);
        this.totalCount.set(0);
      },
    });
  }

  private transformMinistries(data: any[]): MinistrySummary[] {
    return data.map((item) => ({
      ministryId:
        item.id?.toString() ?? item.ministryId?.toString() ?? '',
      ministryName: item.name ?? item.ministryName ?? 'N/A',
      departmentCount:
        item.departmentCount ?? item.numberOfDepartments ?? 0,
      assetCount: item.assetCount ?? item.numberOfAssets ?? 0,
      openIncidents:
        item.openIncidents ?? item.numberOfOpenIncidents ?? 0,
    }));
  }

  isExpanded(ministryId: string): boolean {
    return this.expandedIds().has(ministryId);
  }

  /** Only the arrow button should call this — no other toggles */
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
      this.loadAssetsForMinistry(ministryId);
    }
    this.expandedIds.set(current);
  }

  private loadAssetsForMinistry(ministryId: string): void {
    if (this.assetsByMinistry()[ministryId] !== undefined) {
      return; // already loaded
    }
    this.assetsLoadingByMinistry.update((m) => ({ ...m, [ministryId]: true }));

    const params = new HttpParams().set('PageNumber', '1').set('PageSize', '500');
    this.apiService.getAssestByMinistry(params, ministryId).subscribe({
      next: (response: ApiResponse<any>) => {
        this.assetsLoadingByMinistry.update((m) => ({ ...m, [ministryId]: false }));
        if (response.isSuccessful && response.data) {
          const raw =
            response.data.data ?? response.data.items ?? response.data;
          const list = Array.isArray(raw) ? raw : [];
          const tiles: AssetTile[] = list.map((item: any) => ({
            id: item.id ?? 0,
            assetUrl: item.assetUrl ?? '',
            assetName:
              item.assetName ??
              item.websiteApplication ??
              item.websiteName ??
              item.name ??
              item.assetUrl ??
              'N/A',
            currentStatus:
              (item.currentStatus ?? item.status ?? 'UNKNOWN').toUpperCase(),
            tileValue:
              item.openIncidents != null && item.openIncidents !== ''
                ? Number(item.openIncidents)
                : null,
          }));
          this.assetsByMinistry.update((prev) => ({ ...prev, [ministryId]: tiles }));
        } else {
          this.assetsByMinistry.update((prev) => ({
            ...prev,
            [ministryId]: [],
          }));
        }
      },
      error: () => {
        this.assetsLoadingByMinistry.update((m) => ({ ...m, [ministryId]: false }));
        this.assetsByMinistry.update((prev) => ({
          ...prev,
          [ministryId]: [],
        }));
      },
    });
  }

  getAssets(ministryId: string): AssetTile[] {
    return this.assetsByMinistry()[ministryId] ?? [];
  }

  isAssetsLoading(ministryId: string): boolean {
    return !!this.assetsLoadingByMinistry()[ministryId];
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
    this.loadMinistries();
  }

  onPageChange(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.loadMinistries();
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
