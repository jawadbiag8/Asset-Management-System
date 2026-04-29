import { Component, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import {
  TableConfig,
  FilterPill,
  TableColumn,
} from '../reusable/reusable-table/reusable-table.component';
import {
  ApiResponse,
  ApiService,
  BulkUploadErrorData,
  CommonLookupItem,
} from '../../services/api.service';
import { FilterOptionsService } from '../../services/filter-options.service';
import { HttpParams } from '@angular/common/http';
import { UtilsService } from '../../services/utils.service';
import { DashboardReturnStateService } from '../../services/dashboard-return-state.service';
import { formatDateOrPassThrough } from '../../utils/date-format.util';
import { Router, ActivatedRoute } from '@angular/router';

export interface DigitalAsset {
  id: number;
  ministryId?: number;
  ministryDepartment: string;
  department: string;
  websiteApplication: string;
  assetUrl: string;
  currentStatus: string;
  lastChecked: string | null;
  lastOutage: string;
  lastOutageDate: string | null;
  healthStatus: string;
  healthIndex: number;
  performanceStatus: string;
  performanceIndex: number;
  complianceStatus: string;
  complianceIndex: number;
  riskExposureIndex: string;
  citizenImpactLevel: string;
  openIncidents: number;
  highSeverityIncidents: number;
  hostingTypeName?: string | null;
  hostingClassification?: string | null;
  hostingType?: string | null;
  successRate?: string | number | null;
  failureRate?: string | number | null;
  abandonedRate?: string | number | null;
  totalOccurrences?: string | number | null;
}

@Component({
  selector: 'app-assets',
  templateUrl: './assets.component.html',
  styleUrl: './assets.component.scss',
  standalone: false,
})
export class AssetsComponent implements OnInit {
  readonly assetTabs = [
    { id: 'websites', label: 'Websites' },
    { id: 'webApps', label: 'Web Apps' },
    { id: 'mobileApps', label: 'Mobile Apps' },
  ] as const;

  activeAssetTab = signal<(typeof this.assetTabs)[number]['id']>('websites');
  private readonly defaultWebsiteAssetTypeId = 18;
  private assetTypeIdsByTab: Partial<Record<(typeof this.assetTabs)[number]['id'], number>> = {};

  constructor(
    private apiService: ApiService,
    private filterOptions: FilterOptionsService,
    private utils: UtilsService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private dashboardReturnState: DashboardReturnStateService,
  ) {}

  tableFilters = signal<FilterPill[]>([]);

  /** Header search (design: search bar in top-right). Synced with table search. */
  headerSearchValue = signal('');

  /** Set of asset IDs that are in the user's favorites (for heart icon state). */
  favoriteAssetIds = signal<Set<number>>(new Set());

  @ViewChild('bulkUploadInput') bulkUploadInput!: ElementRef<HTMLInputElement>;

  tableConfig = signal<TableConfig>({
    minWidth: '1150px',
    searchPlaceholder: 'Search Assets',
    serverSideSearch: true,
    defaultPageSize: 10,
    columns: [
      {
        key: 'websiteApplication',
        header: 'Assets',
        cellType: 'two-line',
        primaryField: 'websiteApplication',
        showPrimaryStatusIcon: true,
        primaryStatusField: 'assetLifecycleStatus',
        secondaryField: 'assetUrl',
        linkField: 'assetUrl',
        sortable: true,
        width: '290px',
        routerLinkFn: (row) => ({
          commands: ['/view-assets-detail'],
          queryParams: { id: row.id, ministryId: row.ministryId ?? '' },
        }),
      },
      {
        key: 'ministryDepartment',
        header: 'Department',
        cellType: 'text',
        primaryField: 'ministryDepartment',
        sortable: true,
        width: '185px',
        routerLinkFn: (row) => ({
          commands: ['/ministry-detail'],
          queryParams: { ministryId: row.ministryId ?? '' },
        }),
      },
      {
        key: 'hostingVendor',
        header: 'Hosting Vendor',
        cellType: 'two-line',
        primaryField: 'hostingVendor',
        secondaryField: 'hostingType',
        sortable: true,
        width: '145px',
        secondaryLineClassFn: (row: any) => row.hostingTypeClass ?? '',
      },
      {
        key: 'devVendor',
        header: 'Dev Vendor',
        cellType: 'text',
        primaryField: 'devVendor',
        sortable: true,
        width: '125px',
      },
      {
        key: 'currentStatus',
        header: 'Status',
        cellType: 'status-dot-subtext',
        primaryField: 'currentStatusDisplay',
        subtextField: 'lastCheckedFormatted',
        badgeStatus: (row: any) => {
          const status = row.currentStatus?.toLowerCase();
          if (status === 'up' || status === 'online') return 'success';
          if (status === 'down' || status === 'offline') return 'danger';
          return 'unknown';
        },
        sortable: true,
        width: '95px',
      },
      {
        key: 'healthstatus',
        header: 'Health',
        cellType: 'health-status',
        healthStatusField: 'healthStatusDisplay',
        healthIconField: 'healthIcon',
        healthPercentageField: 'healthPercentage',
        sortable: true,
        sortByKey: 'healthindex',
        width: '95px',
      },
      {
        key: 'performanceStatus',
        header: 'Performance',
        cellType: 'metric-with-trend',
        primaryField: 'performanceStatusDisplay',
        secondaryField: 'performancePercentage',
        sortable: true,
        width: '120px',
        textColor: (row: any) => {
          const status = (row.performanceStatus || '').toLowerCase();
          if (
            status.includes('performing well') ||
            status.includes('well') ||
            status.includes('good')
          )
            return 'success';
          if (status.includes('average')) return 'warning';
          if (status.includes('poor') || status.includes('bad'))
            return 'danger';
          return 'unknown';
        },
        trendIcon: (row: any) => {
          const status = (row.performanceStatus || '').toLowerCase();
          if (
            status.includes('performing well') ||
            status.includes('well') ||
            status.includes('good')
          )
            return 'up';
          if (status.includes('average')) return 'right';
          if (status.includes('poor') || status.includes('bad'))
            return 'down';
          return 'unknown';
        },
      },
      {
        key: 'complianceStatus',
        header: 'Compliance',
        cellType: 'metric-with-trend',
        primaryField: 'complianceStatusDisplay',
        secondaryField: 'compliancePercentage',
        sortable: true,
        width: '120px',
        textColor: (row: any) => {
          const status = (row.complianceStatus || '').toLowerCase();
          if (status.includes('high compliance') || status.includes('high'))
            return 'success';
          if (status.includes('medium compliance') || status.includes('medium'))
            return 'warning';
          if (status.includes('low compliance') || status.includes('low'))
            return 'danger';
          return 'unknown';
        },
        trendIcon: (row: any) => {
          const status = (row.complianceStatus || '').toLowerCase();
          if (status.includes('high compliance') || status.includes('high'))
            return 'up';
          if (status.includes('medium compliance') || status.includes('medium'))
            return 'right';
          if (status.includes('low compliance') || status.includes('low'))
            return 'down';
          return 'unknown';
        },
      },
      {
        key: 'actions',
        header: 'Action',
        cellType: 'actions',
        sortable: false,
        width: '70px',
        actionLinks: [
          {
            label: 'Actions',
            display: 'icon',
            iconName: 'more_vert',
            color: 'rgba(255, 255, 255, 0.74)',
            showTooltip: false,
            menuItems: [
              { label: 'View', iconName: 'visibility' },
              {
                label: 'Favourite',
                iconName: 'star',
                hidden: (row: any) => !this.favoriteAssetIds().has(Number(row?.id)),
              },
              {
                label: 'Favourite',
                iconName: 'star_border',
                hidden: (row: any) => this.favoriteAssetIds().has(Number(row?.id)),
              },
              {
                label: 'Analyze',
                iconName: 'description',
                hidden: () => this.activeAssetTab() !== 'websites',
              },
              { label: 'Edit', iconName: 'edit' },
            ],
          },
        ],
      },
    ],
    data: [],
  });

  digitalAssets = signal<DigitalAsset[]>([]);
  totalItems = signal<number>(0);

  tableConfigWithData = computed<TableConfig>(() => {
    const processedData = this.digitalAssets().map((asset) => {
      const getHealthIcon = (status: string): string => {
        const statusLower = (status || '').toLowerCase();
        if (statusLower === 'healthy' || statusLower === 'up')
          return 'check_circle';
        if (
          statusLower === 'critical' ||
          statusLower === 'down' ||
          statusLower === 'poor'
        )
          return 'error';
        if (
          statusLower === 'average' ||
          statusLower === 'warning' ||
          statusLower === 'fair'
        )
          return 'warning';
        return 'help_outline';
      };

      const formatPercentage = (value: number): string => `${value}%`;

      const formatLastChecked = (checked: string | null): string => {
        if (!checked) return 'N/A';
        try {
          const checkedDate = new Date(checked);
          const now = new Date();
          const diffMs = now.getTime() - checkedDate.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          let ago = 'just now';
          if (diffHours > 24) {
            const diffDays = Math.floor(diffHours / 24);
            ago = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
          } else if (diffHours > 0) {
            ago = diffHours === 1 ? '1 hr ago' : `${diffHours} hrs ago`;
          } else if (diffMinutes > 0) {
            ago = diffMinutes === 1 ? '1 min ago' : `${diffMinutes} mins ago`;
          }
          return ago;
        } catch {
          return 'N/A';
        }
      };

      const formatLastOutageDisplay = (value: string | null | undefined): string => {
        if (!value || value === 'N/A') return value || 'N/A';
        const formatted = formatDateOrPassThrough(value);
        if (formatted !== value) return formatted;
        return String(value)
          .replace(/\b1 minute ago\b/gi, '1 min ago')
          .replace(/\b(\d+) minutes ago\b/gi, '$1 mins ago')
          .replace(/\b1 hour ago\b/gi, '1 hr ago')
          .replace(/\b(\d+) hours ago\b/gi, '$1 hrs ago');
      };

      const formatHealthPercentage = (_status: string, index: number): string =>
        formatPercentage(index);
      const formatPerformancePercentage = (index: number): string =>
        formatPercentage(index);
      const formatCompliancePercentage = (index: number): string =>
        formatPercentage(index);

      const performanceStatusDisplay = ((): string => {
        const s = (asset.performanceStatus || '').toLowerCase();
        if (s.includes('well') || s.includes('good')) return 'Good';
        if (s.includes('average')) return 'Average';
        if (s.includes('poor') || s.includes('bad')) return 'Bad';
        return 'Unknown';
      })();
      const complianceStatusDisplay = ((): string => {
        const s = (asset.complianceStatus || '').toLowerCase();
        if (s.includes('high')) return 'High';
        if (s.includes('medium')) return 'Medium';
        if (s.includes('low')) return 'Low';
        return 'Unknown';
      })();

      const healthStatusDisplay = ((): string => {
        const s = (asset.healthStatus || '').toLowerCase();
        if (s.includes('healthy') || s.includes('up')) return 'Healthy';
        if (s.includes('average') || s.includes('warning') || s.includes('fair'))
          return 'Fair';
        if (s.includes('critical') || s.includes('poor') || s.includes('down'))
          return 'Poor';
        return 'Unknown';
      })();

      const currentStatusDisplay = ((): string => {
        const s = (asset.currentStatus || '').toLowerCase();
        if (s === 'up' || s === 'online') return 'Online';
        if (s === 'down' || s === 'offline') return 'Offline';
        return 'Unknown';
      })();

      const toPercent = (value: string | number | null | undefined): string => {
        if (value == null || value === '') return 'N/A';
        const text = String(value).trim();
        if (!text) return 'N/A';
        return text.includes('%') ? text : `${text}%`;
      };

      const rawHostingType =
        (asset as any).hostingTypeName?.trim() ||
        (asset as any).hostingClassification?.trim() ||
        (asset as any).hostingType?.trim() ||
        'N/A';
      const hostingType = this.normalizeHostingTypeLabel(rawHostingType);

      return {
        ...asset,
        assetLifecycleStatus:
          (asset as any).statusName ??
          (asset as any).assetLifecycleStatus ??
          (asset as any).assetStatusName ??
          (asset as any).assetStatus ??
          (asset as any).verificationStatus ??
          (asset as any).discoveryStatus ??
          '',
        currentStatusDisplay,
        hostingVendor:
          (asset as any).managingVendorName?.trim() ||
          (asset as any).hostingVendor?.trim() ||
          'N/A',
        devVendor:
          (asset as any).developmentVendorName?.trim() ||
          (asset as any).devVendor?.trim() ||
          'N/A',
        hostingType,
        hostingTypeClass: this.getHostingTypeClass(hostingType),
        healthStatusDisplay,
        healthIcon: getHealthIcon(asset.healthStatus),
        healthPercentage: formatHealthPercentage(
          asset.healthStatus,
          asset.healthIndex,
        ),
        performanceStatusDisplay,
        performancePercentage: formatPerformancePercentage(asset.performanceIndex),
        complianceStatusDisplay,
        compliancePercentage: formatCompliancePercentage(asset.complianceIndex),
        lastCheckedFormatted: formatLastChecked(asset.lastChecked),
        lastOutageFormatted: formatLastOutageDisplay(asset.lastOutage),
        successRateDisplay: toPercent((asset as any).successRate),
        failureRateDisplay: toPercent((asset as any).failureRate),
        abandonedRateDisplay: toPercent((asset as any).abandonedRate),
        totalOccurrencesDisplay:
          (asset as any).totalOccurrences == null ||
          (asset as any).totalOccurrences === ''
            ? 'N/A'
            : String((asset as any).totalOccurrences),
        citizenImpactLevel: (asset.citizenImpactLevel || '').split('-')[0]?.trim() || 'Unknown',
        citizenImpactLevelSubtext: (asset.citizenImpactLevel || '').split('-')[1]?.trim() || '',
      };
    });

    return {
      ...this.tableConfig(),
      columns: this.getColumnsForActiveTab(),
      data: processedData,
    };
  });

  private isDefinedColumn(column: TableColumn | undefined): column is TableColumn {
    return !!column;
  }

  private getColumnsForActiveTab(): TableColumn[] {
    const allColumns = this.tableConfig().columns;
    const pick = (key: string): TableColumn | undefined =>
      allColumns.find((column) => column.key === key);

    const fixedColumns = [
      pick('websiteApplication'),
      pick('ministryDepartment'),
      pick('hostingVendor'),
      pick('devVendor'),
    ].filter(this.isDefinedColumn);

    const actionColumn = pick('actions');

    const websiteColumns = [
      ...fixedColumns,
      pick('currentStatus'),
      pick('healthstatus'),
      pick('performanceStatus'),
      pick('complianceStatus'),
      actionColumn,
    ].filter(this.isDefinedColumn);

    if (this.activeAssetTab() === 'websites') {
      return websiteColumns;
    }

    const appExperienceColumns: TableColumn[] = [
      {
        key: 'successRate',
        header: 'Success Rate',
        cellType: 'text-with-color',
        primaryField: 'successRateDisplay',
        secondaryField: '',
        textColor: (row: any) => this.getRateColorClass(row.successRateDisplay),
        sortable: true,
        width: '110px',
      },
      {
        key: 'failureRate',
        header: 'Failure Rate',
        cellType: 'text-with-color',
        primaryField: 'failureRateDisplay',
        secondaryField: '',
        textColor: (row: any) =>
          this.getReverseRateColorClass(row.failureRateDisplay),
        sortable: true,
        width: '110px',
      },
      {
        key: 'abandonedRate',
        header: 'Abandoned Rate',
        cellType: 'text-with-color',
        primaryField: 'abandonedRateDisplay',
        secondaryField: '',
        textColor: (row: any) =>
          this.getReverseRateColorClass(row.abandonedRateDisplay),
        sortable: true,
        width: '130px',
      },
      {
        key: 'totalOccurrences',
        header: 'Total Occurrence',
        cellType: 'text',
        primaryField: 'totalOccurrencesDisplay',
        sortable: true,
        width: '130px',
      },
    ];

    return [
      ...fixedColumns,
      ...appExperienceColumns,
      actionColumn,
    ].filter(this.isDefinedColumn);
  }

  private lastSearchParams: HttpParams = new HttpParams()
    .set('PageNumber', '1')
    .set('PageSize', '10');

  ngOnInit(): void {
    this.initializeFilters();
    this.loadAssetTypeLookups();
    this.applyInitialQueryParams();
    this.loadFavoriteAssets();
  }

  setActiveAssetTab(tabId: (typeof this.assetTabs)[number]['id']): void {
    if (this.activeAssetTab() === tabId) return;
    this.activeAssetTab.set(tabId);
    const nextParams = this.applyActiveAssetType(
      this.lastSearchParams.set('PageNumber', '1'),
    );
    this.lastSearchParams = nextParams;
    this.loadAssets(nextParams);
    this.syncUrlFromFilters();
  }

  loadFavoriteAssets(): void {
    this.apiService.getFavoriteAssets().subscribe({
      next: (res) => {
        if (res?.isSuccessful && Array.isArray(res.data)) {
          const ids = new Set<number>((res.data as any[]).map((item: any) => item.id ?? item.assetId).filter((id): id is number => id != null));
          this.favoriteAssetIds.set(ids);
        }
      },
      error: () => {},
    });
  }

  toggleFavorite(row: { id: number }): void {
    const id = row.id;
    const current = this.favoriteAssetIds();
    if (current.has(id)) {
      this.apiService.removeAssetFromFavorites(id).subscribe({
        next: (r) => {
          if (r?.isSuccessful) {
            const next = new Set(current);
            next.delete(id);
            this.favoriteAssetIds.set(next);
            this.utils.showToast('Removed from Watchlist.', 'Watchlist', 'success');
          } else {
            this.utils.showToast(r?.message ?? 'Could not remove from Watchlist.', 'Watchlist', 'error');
          }
        },
        error: (err) => this.utils.showToast(err?.message ?? 'Could not remove from Watchlist.', 'Watchlist', 'error'),
      });
    } else {
      this.apiService.addAssetToFavorites(id).subscribe({
        next: (r) => {
          if (r?.isSuccessful) {
            const next = new Set(current);
            next.add(id);
            this.favoriteAssetIds.set(next);
            this.utils.showToast('Added to Watchlist.', 'Watchlist', 'success');
          } else {
            this.utils.showToast(r?.message ?? 'Could not add to Watchlist.', 'Watchlist', 'error');
          }
        },
        error: (err) => this.utils.showToast(err?.message ?? 'Could not add to Watchlist.', 'Watchlist', 'error'),
      });
    }
  }

  /** Normalize status from URL: Up -> Online, Down -> Offline (UI shows Online/Offline everywhere). */
  private normalizeStatusFromUrl(value: string): string {
    const u = (value || '').trim().toUpperCase();
    if (u === 'UP') return 'Online';
    if (u === 'DOWN') return 'Offline';
    return value ?? '';
  }

  private applyInitialQueryParams(): void {
    const qp = this.activatedRoute.snapshot.queryParams as Record<string, string>;
    const tabFromQuery = (qp['assetTab'] ?? '').trim();
    const hasTab = this.assetTabs.some((tab) => tab.id === tabFromQuery);
    if (hasTab) {
      this.activeAssetTab.set(tabFromQuery as (typeof this.assetTabs)[number]['id']);
    }

    const paramKeys = [
      'ministryId',
      'currentStatus',
      'health',
      'performance',
      'compliance',
      'riskIndex',
      'CitizenImpactLevelId',
    ];
    let hasAny = false;
    for (const key of paramKeys) {
      if (qp[key]) hasAny = true;
    }
    if (!hasAny) return;

    this.tableFilters.update((filters) =>
      filters.map((f) => {
        if (!f.paramKey) return f;
        let value = qp[f.paramKey];
        if (value == null || value === '') return f;
        if (f.paramKey === 'currentStatus') {
          value = this.normalizeStatusFromUrl(value);
        }
        const labelPart = f.label.split(':')[0] ?? f.paramKey;
        return {
          ...f,
          value,
          label: `${labelPart}: ${value}`,
          removable: true,
        };
      }),
    );
  }

  private loadAssetTypeLookups(): void {
    this.apiService.getCommonLookupByType('assetType').subscribe({
      next: (response: ApiResponse<CommonLookupItem[]>) => {
        const lookups = Array.isArray(response?.data) ? response.data : [];
        this.assetTypeIdsByTab = {
          websites:
            this.findLookupIdByName(lookups, 'website') ??
            this.defaultWebsiteAssetTypeId,
          webApps: this.findLookupIdByName(lookups, 'web app'),
          mobileApps: this.findLookupIdByName(lookups, 'mobile app'),
        };
        this.reloadActiveTabData();
      },
      error: () => {
        this.assetTypeIdsByTab = {
          websites: this.defaultWebsiteAssetTypeId,
        };
        this.reloadActiveTabData();
      },
    });
  }

  private reloadActiveTabData(): void {
    const params = this.applyActiveAssetType(
      this.lastSearchParams.set('PageNumber', '1'),
    );
    this.lastSearchParams = params;
    this.loadAssets(params);
  }

  private findLookupIdByName(
    lookups: CommonLookupItem[],
    lookupName: string,
  ): number | undefined {
    const normalizedName = lookupName.toLowerCase();
    return lookups.find((item) =>
      item.name?.toLowerCase().includes(normalizedName),
    )?.id;
  }

  private applyActiveAssetType(params: HttpParams): HttpParams {
    const tab = this.activeAssetTab();
    const assetTypeId =
      this.assetTypeIdsByTab[tab] ??
      (tab === 'websites' ? this.defaultWebsiteAssetTypeId : undefined);
    if (!assetTypeId) return params.delete('AssetTypeId');
    return params.set('AssetTypeId', String(assetTypeId));
  }

  initializeFilters(): void {
    this.tableFilters.set([
      {
        id: 'ministry',
        label: 'Ministry: All',
        value: '',
        removable: true,
        paramKey: 'ministryId',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'status',
        label: 'Status: All',
        value: '',
        removable: true,
        paramKey: 'currentStatus',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'health',
        label: 'Health: All',
        value: '',
        removable: true,
        paramKey: 'health',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'performance',
        label: 'Performance: All',
        value: '',
        removable: true,
        paramKey: 'performance',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'compliance',
        label: 'Compliance: All',
        value: '',
        removable: true,
        paramKey: 'compliance',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'riskIndex',
        label: 'Risk Index: All',
        value: '',
        removable: true,
        paramKey: 'riskIndex',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'citizenImpact',
        label: 'Citizen Impact: All',
        value: '',
        removable: true,
        paramKey: 'CitizenImpactLevelId',
        options: [{ label: 'All', value: '' }],
      },
    ]);
    this.loadFilterOptions();
  }

  loadFilterOptions(): void {
    this.filterOptions.loadFilterOptions().subscribe({
      next: () => {
        this.updateFilterOptions('ministry', this.filterOptions.ministryOptions());
        this.updateFilterOptions('status', this.filterOptions.statusOptions());
        this.updateFilterOptions('citizenImpact', this.filterOptions.citizenImpactOptions());
        this.updateFilterOptions('health', this.filterOptions.healthOptions());
        this.updateFilterOptions('performance', this.filterOptions.performanceOptions());
        this.updateFilterOptions('compliance', this.filterOptions.complianceOptions());
        this.updateFilterOptions('riskIndex', this.filterOptions.riskIndexOptions());
      },
      error: (error: unknown) => {
        this.utils.showToast(error, 'Error loading filter options', 'error');
        this.updateFilterOptions('ministry', [{ label: 'All', value: '' }]);
        this.updateFilterOptions('status', [{ label: 'All', value: '' }]);
        this.updateFilterOptions('citizenImpact', [{ label: 'All', value: '' }]);
      },
    });
  }

  updateFilterOptions(
    filterId: string,
    options: { label: string; value: string }[],
  ): void {
    this.tableFilters.update((filters) => {
      return filters.map((filter) => {
        if (filter.id === filterId) {
          const selectedValue = filter.value;
          const newLabel =
            selectedValue && selectedValue !== '' && selectedValue !== 'All'
              ? `${filter.label.split(':')[0]}: ${options.find((opt) => opt.value === selectedValue)?.label || selectedValue}`
              : `${filter.label.split(':')[0]}: All`;
          return {
            ...filter,
            options,
            label: newLabel,
          };
        }
        return filter;
      });
    });
  }

  private syncFiltersFromParams(params: HttpParams): void {
    this.tableFilters.update((filters) =>
      filters.map((f) => {
        if (!f.paramKey) return f;
        const paramValue = params.get(f.paramKey);
        const value = paramValue ?? '';
        const isAll = value === '' || value === 'All';
        const option =
          !isAll && f.options?.length
            ? f.options.find((o) => o.value === value)
            : null;
        const label = isAll
          ? `${f.label.split(':')[0]}: All`
          : option
            ? `${f.label.split(':')[0]}: ${option.label}`
            : `${f.label.split(':')[0]}: ${value}`;
        return {
          ...f,
          value,
          label,
          removable: !isAll,
        };
      }),
    );
  }

  onSearchQuery(params: HttpParams): void {
    const paramsWithType = this.applyActiveAssetType(params);
    this.lastSearchParams = paramsWithType;
    const searchTerm = params.get('SearchTerm') ?? '';
    this.headerSearchValue.set(searchTerm);
    this.syncFiltersFromParams(paramsWithType);
    this.loadAssets(paramsWithType);
    this.syncUrlFromFilters();
  }

  onHeaderSearchChange(value: string): void {
    this.headerSearchValue.set(value ?? '');
  }

  onHeaderSearchSubmit(): void {
    let params = this.lastSearchParams;
    const term = this.headerSearchValue().trim();
    if (term) {
      params = params.set('SearchTerm', term).set('PageNumber', '1');
    } else {
      params = params.delete('SearchTerm').set('PageNumber', '1');
    }
    const paramsWithType = this.applyActiveAssetType(params);
    this.lastSearchParams = paramsWithType;
    this.loadAssets(paramsWithType);
    this.syncUrlFromFilters();
  }

  private getCurrentQueryParamsForReturn(): Record<string, string> {
    const queryParams: Record<string, string> = {
      assetTab: this.activeAssetTab(),
    };
    this.tableFilters().forEach((f) => {
      if (f.paramKey && f.value && f.value !== '' && f.value !== 'All') {
        queryParams[f.paramKey] = f.value;
      }
    });
    return queryParams;
  }

  private syncUrlFromFilters(): void {
    const queryParams = this.getCurrentQueryParamsForReturn();
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams,
      replaceUrl: true,
    });
  }

  loadAssets(searchParams: HttpParams): void {
    this.apiService.getAssets(searchParams).subscribe({
      next: (response: ApiResponse) => {
        if (response.isSuccessful) {
          this.digitalAssets.set(response.data.data);
          this.totalItems.set(response.data.totalCount);
        } else {
          this.utils.showToast(
            response.message,
            'Error loading assets',
            'error',
          );
          this.digitalAssets.set([]);
          this.totalItems.set(0);
        }
      },
      error: (error) => {
        this.utils.showToast(error, 'Error loading assets', 'error');
        this.digitalAssets.set([]);
        this.totalItems.set(0);
      },
    });
  }

  onDownloadTemplate(): void {
    this.apiService.getBulkUploadTemplate().subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk-upload-template.csv';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        this.utils.showToast('Template downloaded successfully.', 'Import Assets', 'success');
      },
      error: () => {
        this.utils.showToast('Failed to download template. Please try again.', 'Import Assets', 'error');
      },
    });
  }

  onBulkUpload(): void {
    this.bulkUploadInput?.nativeElement?.click();
  }

  onBulkUploadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.apiService.bulkUpload(file).subscribe({
      next: (res) => {
        if (res.isSuccessful) {
          this.utils.showToast(
            res.message ?? 'Bulk upload completed successfully.',
            'Import Assets',
            'success',
          );
          this.loadAssets(this.lastSearchParams);
        } else {
          const data = res.data as BulkUploadErrorData | undefined;
          if (data?.errors?.length) {
            this.utils.showToast(
              (res.message ?? 'Bulk upload failed.') + ' Error report has been downloaded.',
              'Import Assets',
              'error',
            );
          } else {
            this.utils.showToast(res.message ?? 'Bulk upload failed.', 'Import Assets', 'error');
          }
        }
        input.value = '';
      },
      error: (err: any) => {
        const body = err?.error;
        const data = body?.data as BulkUploadErrorData | undefined;
        if (data?.errors?.length) {
          this.utils.showToast('Bulk upload failed. Error report has been downloaded.', 'Import Assets', 'error');
        } else {
          this.utils.showToast(err?.message ?? 'Bulk upload failed.', 'Import Assets', 'error');
        }
        input.value = '';
      },
    });
  }

  onActionClick(event: { row: any; columnKey: string }): void {
    if (event.columnKey === 'View' || event.columnKey === 'Open Asset') {
      this.onAssetMenuClick(event.row);
      return;
    }
    if (event.columnKey === 'Favourite') {
      this.toggleFavorite(event.row);
      return;
    }
    if (event.columnKey === 'Analyze') {
      this.navigateToIncidentsWithFilters(event.row);
      return;
    }
    if (event.columnKey === 'Edit Asset') {
      this.onEditClick(event.row);
      return;
    }
    if (event.columnKey === 'Edit') {
      this.onEditClick(event.row);
    }
  }

  private onAssetMenuClick(row: any): void {
    if (!row?.id) return;
    this.router.navigate(['/view-assets-detail'], {
      queryParams: { id: row.id, ministryId: row.ministryId ?? '' },
    });
  }

  private getHostingTypeClass(
    hostingType: string,
  ):
    | 'hosting-pill--onprem'
    | 'hosting-pill--cloud'
    | 'hosting-pill--vendor'
    | 'hosting-pill--default' {
    const normalized = hostingType.trim().toLowerCase();
    if (
      normalized.includes('on-prem') ||
      normalized.includes('on premise') ||
      normalized.includes('onprem')
    ) {
      return 'hosting-pill--onprem';
    }
    if (normalized.includes('cloud')) return 'hosting-pill--cloud';
    if (normalized.includes('vendor') || normalized.includes('private')) {
      return 'hosting-pill--vendor';
    }
    return 'hosting-pill--default';
  }

  private normalizeHostingTypeLabel(hostingType: string): string {
    const normalized = hostingType.trim().toLowerCase();
    if (
      normalized.includes('on-prem') ||
      normalized.includes('on premise') ||
      normalized.includes('onprem')
    ) {
      return 'On-Premise';
    }
    if (normalized === 'private') return 'Private';
    if (normalized === 'cloud') return 'Cloud';
    return hostingType;
  }

  private getRateColorClass(value: string | null | undefined): string {
    const parsed = this.parsePercentValue(value);
    if (parsed == null) return 'unknown';
    if (parsed > 90) return 'success';
    if (parsed >= 70) return 'warning';
    return 'danger';
  }

  private getReverseRateColorClass(value: string | null | undefined): string {
    const parsed = this.parsePercentValue(value);
    if (parsed == null) return 'unknown';
    if (parsed > 90) return 'danger';
    if (parsed >= 70) return 'warning';
    return 'success';
  }

  private parsePercentValue(value: string | null | undefined): number | null {
    const normalized = String(value ?? '')
      .replace('%', '')
      .trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  onEditClick(row: any): void {
    if (row?.id) {
      this.dashboardReturnState.setReturnQueryParams(
        this.getCurrentQueryParamsForReturn(),
      );
      this.router.navigate(['/edit-digital-asset'], {
        queryParams: { assetId: row.id },
      });
    }
  }

  navigateToIncidentsWithFilters(row: any): void {
    const queryParams: Record<string, string | number> = {
      PageNumber: 1,
      PageSize: 10,
      Status: 'Open',
      AssetId: row?.id ?? 0,
    };
    if (row?.ministryId != null && row.ministryId !== '') {
      queryParams['MinistryId'] = row.ministryId;
    }
    this.router.navigate(['/incidents'], { queryParams });
  }
}
