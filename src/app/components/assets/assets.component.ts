import { Component, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import {
  TableConfig,
  FilterPill,
} from '../reusable/reusable-table/reusable-table.component';
import { ApiResponse, ApiService, BulkUploadErrorData } from '../../services/api.service';
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
}

@Component({
  selector: 'app-assets',
  templateUrl: './assets.component.html',
  styleUrl: './assets.component.scss',
  standalone: false,
})
export class AssetsComponent implements OnInit {
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

  @ViewChild('bulkUploadInput') bulkUploadInput!: ElementRef<HTMLInputElement>;

  tableConfig = signal<TableConfig>({
    minWidth: '1150px',
    searchPlaceholder: 'Search Assets',
    serverSideSearch: true,
    defaultPageSize: 10,
    columns: [
      {
        key: 'ministryDepartment',
        header: 'Ministry/Department',
        cellType: 'two-line',
        primaryField: 'ministryDepartment',
        secondaryField: 'department',
        sortable: true,
        width: '220px',
        routerLinkFn: (row) => ({
          commands: ['/ministry-detail'],
          queryParams: { ministryId: row.ministryId ?? '' },
        }),
        trailingButtonLabel: 'Analyze',
        trailingButtonClick: (row) =>
          this.router.navigate(['/asset-control-panel'], {
            queryParams: { assetId: row.id },
          }),
      },
      {
        key: 'websiteApplication',
        header: 'Asset',
        cellType: 'two-line',
        primaryField: 'websiteApplication',
        secondaryField: 'assetUrl',
        linkField: 'assetUrl',
        sortable: true,
        width: '140px',
      },
      {
        key: 'currentStatus',
        header: 'Status',
        cellType: 'badge-with-subtext',
        badgeField: 'currentStatus',
        subtextField: 'lastCheckedFormatted',
        badgeColor: (row: any) => {
          const status = row.currentStatus?.toLowerCase();
          if (status === 'up' || status === 'online')
            return 'var(--color-green-light)';
          if (status === 'down' || status === 'offline')
            return 'var(--color-red-light)';
          return 'var(--color-bg-quaternary)';
        },
        badgeTextColor: (row: any) => {
          const status = row.currentStatus?.toLowerCase();
          if (status === 'up' || status === 'online')
            return 'var(--color-green-dark)';
          if (status === 'down' || status === 'offline')
            return 'var(--color-red-dark)';
          return 'var(--color-text-tertiary)';
        },
        sortable: true,
        width: '95px',
      },
      {
        key: 'healthstatus',
        header: 'Health',
        cellType: 'health-status',
        healthStatusField: 'healthStatus',
        healthIconField: 'healthIcon',
        healthPercentageField: 'healthPercentage',
        sortable: true,
        sortByKey: 'healthindex',
        width: '85px',
      },
      {
        key: 'performanceStatus',
        header: 'Performance',
        cellType: 'text-with-color',
        primaryField: 'performanceStatus',
        secondaryField: 'performancePercentage',
        sortable: true,
        width: '100px',
        textColor: (row: any) => {
          const status = (row.performanceStatus || '').toLowerCase();
          if (
            status.includes('performing well') ||
            status.includes('well') ||
            status.includes('good')
          )
            return 'success';
          if (status.includes('average')) return 'warning';
          if (status.includes('poor')) return 'danger';
          return '';
        },
      },
      {
        key: 'complianceStatus',
        header: 'Compliance',
        cellType: 'text-with-color',
        primaryField: 'complianceStatus',
        secondaryField: 'compliancePercentage',
        sortable: true,
        width: '100px',
        textColor: (row: any) => {
          const status = (row.complianceStatus || '').toLowerCase();
          if (status.includes('high compliance') || status.includes('high'))
            return 'success';
          if (status.includes('medium compliance') || status.includes('medium'))
            return 'warning';
          if (status.includes('low compliance') || status.includes('low'))
            return 'danger';
          return '';
        },
      },
      {
        key: 'riskExposureIndex',
        header: 'Risk',
        cellType: 'text-with-color',
        primaryField: 'riskExposureDisplay',
        textColor: (row: any) => {
          const risk = (row.riskExposureIndex || '').toUpperCase();
          if (risk === 'LOW RISK' || risk.includes('LOW')) {
            return 'success';
          } else if (risk === 'MEDIUM RISK' || risk.includes('MEDIUM')) {
            return 'warning';
          } else if (risk === 'HIGH RISK' || risk.includes('HIGH')) {
            return 'danger';
          } else if (risk === 'UNKNOWN' || risk === 'N/A') {
            return 'default';
          }
          return 'default';
        },
        sortable: true,
        width: '65px',
      },
      {
        key: 'citizenImpactLevel',
        header: 'Citizen Impact',
        cellType: 'badge-with-subtext',
        badgeField: 'citizenImpactLevel',
        subtextField: 'citizenImpactLevelSubtext',
        subtextAsTooltip: true,
        tooltip: (row: any) => row.citizenImpactLevelSubtext ?? '',
        tooltipPosition: 'above',
        badgeColor: (row: any) => {
          const impact = row.citizenImpactLevel?.toUpperCase();
          if (impact?.includes('LOW')) return 'var(--color-green-light)';
          if (impact?.includes('MEDIUM')) return 'var(--color-yellow-light)';
          if (impact?.includes('HIGH')) return 'var(--color-red-light)';
          return 'var(--color-bg-quaternary)';
        },
        badgeTextColor: (row: any) => {
          const impact = row.citizenImpactLevel?.toUpperCase();
          if (impact?.includes('LOW')) return 'var(--color-green-dark)';
          if (impact?.includes('MEDIUM')) return 'var(--color-yellow)';
          if (impact?.includes('HIGH')) return 'var(--color-red-dark)';
          return 'var(--color-text-tertiary)';
        },
        sortable: true,
        width: '105px',
      },
      {
        key: 'openIncidents',
        header: 'Open Incidents',
        cellType: 'two-line',
        primaryField: 'openIncidents',
        secondaryField: 'highSeverityText',
        sortable: true,
        width: '110px',
        onClick: (row: any) => this.navigateToIncidentsWithFilters(row),
      },
    ],
    data: [],
  });

  digitalAssets = signal<DigitalAsset[]>([]);
  totalItems = signal<number>(0);

  tableConfigWithData = computed<TableConfig>(() => {
    const processedData = this.digitalAssets().map((asset) => {
      const getHealthIcon = (status: string): string => {
        const statusLower = status.toLowerCase();
        if (statusLower === 'healthy' || statusLower === 'up')
          return 'check_circle';
        if (
          statusLower === 'critical' ||
          statusLower === 'down' ||
          statusLower === 'poor'
        )
          return 'error';
        if (statusLower === 'average' || statusLower === 'warning')
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

      const formatRiskDisplay = (value: string | null | undefined): string => {
        if (!value) return value ?? '';
        const u = value.toUpperCase();
        if (u === 'LOW RISK' || u.includes('LOW')) return 'LOW';
        if (u === 'MEDIUM RISK' || u.includes('MEDIUM')) return 'MEDIUM';
        if (u === 'HIGH RISK' || u.includes('HIGH')) return 'HIGH';
        return value.toUpperCase();
      };

      const formatHighSeverityText = (highSeverity: number): string => {
        if (highSeverity === 0) return 'Critical Severity: N/A';
        return `Critical Severity: ${highSeverity}`;
      };

      return {
        ...asset,
        healthIcon: getHealthIcon(asset.healthStatus),
        healthPercentage: formatHealthPercentage(
          asset.healthStatus,
          asset.healthIndex,
        ),
        performancePercentage: formatPerformancePercentage(asset.performanceIndex),
        compliancePercentage: formatCompliancePercentage(asset.complianceIndex),
        lastCheckedFormatted: formatLastChecked(asset.lastChecked),
        lastOutageFormatted: formatLastOutageDisplay(asset.lastOutage),
        riskExposureDisplay: formatRiskDisplay(asset.riskExposureIndex),
        highSeverityText: formatHighSeverityText(asset.highSeverityIncidents),
        citizenImpactLevel: asset.citizenImpactLevel.split('-')[0],
        citizenImpactLevelSubtext: asset.citizenImpactLevel.split('-')[1],
      };
    });

    return {
      ...this.tableConfig(),
      data: processedData,
    };
  });

  private lastSearchParams: HttpParams = new HttpParams()
    .set('PageNumber', '1')
    .set('PageSize', '10');

  ngOnInit(): void {
    this.initializeFilters();
    this.applyInitialQueryParams();
  }

  private applyInitialQueryParams(): void {
    const qp = this.activatedRoute.snapshot.queryParams as Record<string, string>;
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
        const value = qp[f.paramKey];
        if (value == null || value === '') return f;
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
    this.lastSearchParams = params;
    const searchTerm = params.get('SearchTerm') ?? '';
    this.headerSearchValue.set(searchTerm);
    this.syncFiltersFromParams(params);
    this.loadAssets(params);
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
    this.lastSearchParams = params;
    this.loadAssets(params);
    this.syncUrlFromFilters();
  }

  private getCurrentQueryParamsForReturn(): Record<string, string> {
    const queryParams: Record<string, string> = {};
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
    if (event.columnKey === 'Edit Asset') {
      this.onEditClick(event.row);
    }
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
      StatusId: 14,
      AssetId: row?.id ?? 0,
    };
    if (row?.ministryId != null && row.ministryId !== '') {
      queryParams['MinistryId'] = row.ministryId;
    }
    this.router.navigate(['/incidents'], { queryParams });
  }
}
