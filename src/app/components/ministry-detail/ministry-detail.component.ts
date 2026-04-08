import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { HttpParams } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  TableConfig,
  TableColumn,
  FilterPill,
} from '../reusable/reusable-table/reusable-table.component';
import { ApiService, ApiResponse } from '../../services/api.service';
import {
  CreateServiceRequest,
  MinistryServiceItem as ApiMinistryServiceItem,
  MinistryServicesResponseData,
} from '../../services/api.service';
import {
  ServiceDialogComponent,
  ServiceDialogResult,
} from '../reusable/service-dialog/service-dialog.component';

export interface AssetDetail {
  id: number;
  department: string;
  websiteName: string;
  websiteUrl: string;
  currentStatus: string;
  currentStatusChecked: string;
  lastOutage: string;
  currentHealthStatus: string;
  currentHealthIcon: string;
  currentHealthPercentage: string;
  healthIndex?: number | null;
  performanceStatus: string;
  performancePercentage: string;
  performanceIndex?: number | null;
  complianceStatus: string;
  compliancePercentage: string;
  complianceIndex?: number | null;
  riskExposureIndex: string;
  citizenImpactLevel: string;
  citizenImpactLevelSubtext: string;
  openIncidents: number | string;
  highSeverityIncidents: number | string;
}

interface MinistryServiceItem {
  id: number;
  serviceName: string;
  description?: string;
  serviceTypeId?: number | null;
  serviceType: string;
  serviceMode: string;
  status: 'Active' | 'Inactive';
  digitalMaturity: number | null;
  digitalMaturityText: string;
  assetIds?: number[];
  assetsCount: number;
  stepsCount: number;
  createdAt: string;
  createdBy: string;
  assetId?: number | null;
}

@Component({
  selector: 'app-ministry-detail',
  standalone: false,
  templateUrl: './ministry-detail.component.html',
  styleUrl: './ministry-detail.component.scss',
})
export class MinistryDetailComponent implements OnInit, OnDestroy {
  readonly detailTabs = [
    { id: 'assets', label: 'Assets' },
    { id: 'services', label: 'Services' },
  ] as const;
  activeDetailTab = signal<'assets' | 'services'>('assets');
  servicesSummaryCount = signal<number>(14);
  serviceAssetOptions = signal<{ label: string; value: number }[]>([]);
  serviceTypeOptions = signal<{ label: string; value: number }[]>([
    { label: 'Citizen Facing', value: 32 },
    { label: 'Internal', value: 33 },
  ]);
  servicesLoading = signal<boolean>(false);
  servicesError = signal<string | null>(null);
  servicesSummaryCards = signal([
    {
      id: 1,
      value: '7',
      title: 'Total Assets',
      subTitle: 'Active monitoring across all departments',
      linkText: 'View all >',
      linkPath: '/asset',
    },
    {
      id: 2,
      value: '14',
      title: 'Total Services',
      subTitle: 'Incidents across all departments',
      linkText: 'View all incidents >',
      linkPath: '#',
    },
    {
      id: 3,
      value: '8',
      title: 'Open Incidents',
      subTitle: 'All incidents: 20',
      linkText: 'View open incidents >',
      linkPath: '/incidents',
      linkQueryParams: { Status: 'Open' },
    },
    {
      id: 4,
      value: '2',
      title: 'High Severity Open Incidents',
      subTitle: 'Active High Severity Unresolved Incidents',
      linkText: 'View Open High Severity Incidents >',
      linkPath: '/incidents',
      linkQueryParams: { SeverityId: 'P2', Status: 'Open' },
    },
  ]);
  readonly activeSummaryCards = computed(() =>
    this.activeDetailTab() === 'services' ? this.servicesSummaryCards() : this.summaryCards(),
  );
  readonly services = signal<MinistryServiceItem[]>([
    {
      id: 1,
      serviceName: 'Service Name Here',
      serviceType: 'Citizen Facing/Internal',
      serviceMode: 'Manual',
      status: 'Active',
      digitalMaturity: 89,
      digitalMaturityText: '89%',
      assetsCount: 3,
      stepsCount: 4,
      createdAt: '01/01/2026',
      createdBy: 'Username 123',
    },
    {
      id: 2,
      serviceName: 'Service Name Here',
      serviceType: 'Citizen Facing/Internal',
      serviceMode: 'Manual',
      status: 'Inactive',
      digitalMaturity: 29,
      digitalMaturityText: '29%',
      assetsCount: 3,
      stepsCount: 4,
      createdAt: '01/01/2026',
      createdBy: 'Username 123',
    },
  ]);

  tableFilters = signal<FilterPill[]>([
    {
      id: 'status',
      label: 'Status: All',
      value: '',
      removable: true,
      paramKey: 'status',
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

  summaryCards = signal([
    {
      id: 1,
      value: '0',
      title: 'Total Assets',
      subTitle: 'Active Monitoring Across All Departments',
      linkText: 'View All >',
      linkPath: '/asset',
    },
    {
      id: 2,
      value: '0',
        title: 'Total Incidents',
        subTitle: 'Incidents Across All Departments',
        linkText: 'View All Incidents >',
        linkPath: '/incidents',
        linkQueryParams: { MinistryId: '' },
    },
    {
      id: 3,
      value: '0',
      badge: '0/0',
      title: 'Open Incidents',
      subTitle: 'Active Unresolved Incidents',
      linkText: 'View Open Incidents >',
      linkPath: '/incidents',
      linkQueryParams: { MinistryId: '', Status: 'Open' },
    },
    {
      id: 4,
      value: '0',
      badge: '0/0',
      badgeColor: 'red',
      title: 'High Severity Open Incidents',
      subTitle: 'Active High Severity Unresolved Incidents',
      linkText: 'View Open High Severity Incidents >',
      linkPath: '/incidents',
      linkQueryParams: { MinistryId: '', SeverityId: 'P2', Status: 'Open' },
    },
  ]);

  ministryId: number | null = null;
  totalItems = signal<number>(0);
  isLoading = signal<boolean>(false);
  ministryName = signal<string>('');

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private breadcrumbService: BreadcrumbService,
    private dialog: MatDialog,
    private toastr: ToastrService,
  ) {}

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
        secondaryField: 'assetUrl',
        linkField: 'assetUrl',
        sortable: true,
        width: '240px',
        routerLinkFn: (row: AssetDetail) => ({
          commands: ['/view-assets-detail'],
          queryParams: { id: row.id, ministryId: this.ministryId },
        }),
        trailingButtonLabel: 'Analyze',
        trailingButtonClick: (row: any) =>
          this.router.navigate(['/asset-control-panel'], {
            queryParams: { assetId: row.id },
          }),
      },
      {
        key: 'department',
        header: 'Department',
        cellType: 'text',
        primaryField: 'department',
        sortable: true,
        width: '220px',
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
        width: '100px',
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
        key: 'riskExposureIndex',
        header: 'Risk',
        cellType: 'metric-with-trend',
        primaryField: 'riskExposureDisplay',
        secondaryField: '',
        sortable: true,
        width: '95px',
        textColor: (row: any) => {
          const risk = (row.riskExposureIndex || '').toUpperCase();
          if (risk === 'LOW RISK' || risk.includes('LOW')) return 'success';
          if (risk === 'MEDIUM RISK' || risk.includes('MEDIUM'))
            return 'warning';
          if (risk === 'HIGH RISK' || risk.includes('HIGH')) return 'danger';
          return 'unknown';
        },
        trendIcon: (row: any) => {
          const risk = (row.riskExposureIndex || '').toUpperCase();
          if (risk === 'LOW RISK' || risk.includes('LOW')) return 'down';
          if (risk === 'MEDIUM RISK' || risk.includes('MEDIUM')) return 'right';
          if (risk === 'HIGH RISK' || risk.includes('HIGH')) return 'up';
          return 'unknown';
        },
      },
      {
        key: 'citizenImpactLevel',
        header: 'Citizen Impact',
        cellType: 'metric-with-trend',
        primaryField: 'citizenImpactLevelDisplay',
        secondaryField: '',
        sortable: true,
        width: '105px',
        textColor: (row: any) => {
          const impact = row.citizenImpactLevel?.toUpperCase();
          if (impact?.includes('LOW')) return 'success';
          if (impact?.includes('MEDIUM')) return 'warning';
          if (impact?.includes('HIGH')) return 'danger';
          return 'unknown';
        },
        trendIcon: (row: any) => {
          const impact = row.citizenImpactLevel?.toUpperCase();
          if (impact?.includes('LOW')) return 'down';
          if (impact?.includes('MEDIUM')) return 'right';
          if (impact?.includes('HIGH')) return 'up';
          return 'unknown';
        },
      },
      {
        key: 'openIncidents',
        header: 'Open Incidents',
        cellType: 'two-line',
        primaryField: 'openIncidentsDisplay',
        secondaryField: 'highSeverityText',
        sortable: true,
        width: '110px',
        secondaryLineClassFn: (row: any) =>
          (row.highSeverityIncidents ?? 0) > 0
            ? 'open-incidents-value-red'
            : '',
      },
    ],
    data: [],
  });

  assetDetails = signal<AssetDetail[]>([]);

  // Computed: same display fields and shape as assets page (assets.component.ts tableConfigWithData)
  tableConfigWithData = computed<TableConfig>(() => {
    const data = this.assetDetails().map((asset) => {
      const currentStatusDisplay = ((): string => {
        const s = (asset.currentStatus || '').toLowerCase();
        if (s === 'up' || s === 'online') return 'Online';
        if (s === 'down' || s === 'offline') return 'Offline';
        return asset.currentStatus || 'Unknown';
      })();
      const healthStatusDisplay = ((): string => {
        const s = (asset.currentHealthStatus || '').toLowerCase();
        if (s.includes('healthy') || s.includes('up')) return 'Healthy';
        if (s.includes('average') || s.includes('warning') || s.includes('fair'))
          return 'Fair';
        if (s.includes('critical') || s.includes('poor') || s.includes('down'))
          return 'Poor';
        return 'Unknown';
      })();
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
      const riskExposureDisplay = ((): string => {
        const u = (asset.riskExposureIndex || '').toUpperCase();
        if (u === 'LOW RISK' || u.includes('LOW')) return 'Low';
        if (u === 'MEDIUM RISK' || u.includes('MEDIUM')) return 'Medium';
        if (u === 'HIGH RISK' || u.includes('HIGH')) return 'High';
        return (asset.riskExposureIndex || 'Unknown').split('-')[0]?.trim() || 'Unknown';
      })();
      const citizenImpactLevelDisplay = (asset.citizenImpactLevel || '').split('-')[0]?.trim() || 'Unknown';
      const healthPercentage =
        asset.healthIndex != null ? `${asset.healthIndex}%` : 'N/A';
      const performancePercentage =
        asset.performanceIndex != null ? `${asset.performanceIndex}%` : 'N/A';
      const compliancePercentage =
        asset.complianceIndex != null ? `${asset.complianceIndex}%` : 'N/A';
      const highSeverityNum =
        typeof asset.highSeverityIncidents === 'number'
          ? asset.highSeverityIncidents
          : Number(asset.highSeverityIncidents);
      const openIncidentsDisplay =
        typeof asset.openIncidents === 'number'
          ? asset.openIncidents
          : Number(asset.openIncidents);
      const openIncidentsNum = Number.isNaN(openIncidentsDisplay)
        ? 0
        : openIncidentsDisplay;
      return {
        ...asset,
        websiteApplication: asset.websiteName,
        assetUrl: asset.websiteUrl,
        currentStatusDisplay,
        lastCheckedFormatted: asset.currentStatusChecked,
        healthStatusDisplay,
        healthIcon: asset.currentHealthIcon,
        healthPercentage,
        performanceStatusDisplay,
        performancePercentage,
        complianceStatusDisplay,
        compliancePercentage,
        riskExposureDisplay,
        citizenImpactLevelDisplay,
        openIncidentsDisplay: openIncidentsNum,
        highSeverityText: `Critical Severity: ${highSeverityNum ?? 0}`,
      };
    });
    return {
      ...this.tableConfig(),
      data,
    };
  });

  ngOnInit() {
    // Load filter options from APIs (same as dashboard)
    this.initializeFilters();
    // Get ministryId from query params
    this.route.queryParams.subscribe((params) => {
      const id = params['ministryId'];
      if (id) {
        this.ministryId = +id;
        // Load summary cards data
        this.loadSummaryCards();
        this.loadServices();
        this.loadServiceAssetOptions();
        // Trigger initial load when ministryId is available
        // The table component will emit searchQuery on init, which will call loadAssets
      }
      if (params['tab'] === 'services') {
        this.activeDetailTab.set('services');
      }
    });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setCurrentLabel(null);
  }

  initializeFilters(): void {
    this.tableFilters.set([
      {
        id: 'status',
        label: 'Status: All',
        value: '',
        removable: true,
        paramKey: 'status',
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

  /** Map LOV API response to filter options (All + items with label/value) */
  private mapLovToOptions(data: any[]): { label: string; value: string }[] {
    const options = [{ label: 'All', value: '' }];
    (Array.isArray(data) ? data : []).forEach((item: any) => {
      options.push({
        label: item.name ?? item.label ?? String(item.id ?? ''),
        value: item.name ?? item.label ?? item.id?.toString() ?? '',
      });
    });
    return options;
  }

  loadFilterOptions(): void {
    const toSafeLov = (lovType: 'Status' | 'citizenImpactLevel') =>
      this.apiService
        .getLovByType(lovType)
        .pipe(
          catchError(() =>
            of({ isSuccessful: false, data: [] } as ApiResponse),
          ),
        );

    forkJoin({
      statuses: toSafeLov('Status'),
      citizenImpactLevels: toSafeLov('citizenImpactLevel'),
    }).subscribe({
      next: (responses) => {
        if (responses.statuses.isSuccessful) {
          this.updateFilterOptions(
            'status',
            this.mapLovToOptions(responses.statuses.data ?? []),
          );
        } else {
          this.updateFilterOptions('status', [{ label: 'All', value: '' }]);
        }
        if (responses.citizenImpactLevels.isSuccessful) {
          this.updateFilterOptions(
            'citizenImpact',
            this.mapLovToOptions(responses.citizenImpactLevels.data ?? []),
          );
        } else {
          this.updateFilterOptions('citizenImpact', [
            { label: 'All', value: '' },
          ]);
        }
        // Hardcoded options for Health, Performance, Compliance, Risk Index (same as dashboard)
        this.updateFilterOptions('health', [
          { label: 'All', value: '' },
          { label: 'Healthy', value: 'Healthy' },
          { label: 'Critical', value: 'Critical' },
          { label: 'Unknown', value: 'Unknown' },
        ]);
        this.updateFilterOptions('performance', [
          { label: 'All', value: '' },
          { label: 'Performing Well', value: 'Performing Well' },
          { label: 'Average', value: 'Average' },
          { label: 'Poor', value: 'Poor' },
        ]);
        this.updateFilterOptions('compliance', [
          { label: 'All', value: '' },
          { label: 'High Compliance', value: 'High Compliance' },
          { label: 'Medium Compliance', value: 'Medium Compliance' },
          { label: 'Low Compliance', value: 'Low Compliance' },
        ]);
        this.updateFilterOptions('riskIndex', [
          { label: 'All', value: '' },
          { label: 'LOW RISK', value: 'LOW RISK' },
          { label: 'MEDIUM RISK', value: 'MEDIUM RISK' },
          { label: 'HIGH RISK', value: 'HIGH RISK' },
          { label: 'UNKNOWN', value: 'UNKNOWN' },
        ]);
      },
      error: () => {
        this.setStaticFilterOptionsFallback();
      },
    });
  }

  private setStaticFilterOptionsFallback(): void {
    this.updateFilterOptions('status', [{ label: 'All', value: '' }]);
    this.updateFilterOptions('health', [
      { label: 'All', value: '' },
      { label: 'Healthy', value: 'Healthy' },
      { label: 'Critical', value: 'Critical' },
      { label: 'Unknown', value: 'Unknown' },
    ]);
    this.updateFilterOptions('performance', [
      { label: 'All', value: '' },
      { label: 'Performing Well', value: 'Performing Well' },
      { label: 'Average', value: 'Average' },
      { label: 'Poor', value: 'Poor' },
    ]);
    this.updateFilterOptions('compliance', [
      { label: 'All', value: '' },
      { label: 'High Compliance', value: 'High Compliance' },
      { label: 'Medium Compliance', value: 'Medium Compliance' },
      { label: 'Low Compliance', value: 'Low Compliance' },
    ]);
    this.updateFilterOptions('riskIndex', [
      { label: 'All', value: '' },
      { label: 'LOW RISK', value: 'LOW RISK' },
      { label: 'MEDIUM RISK', value: 'MEDIUM RISK' },
      { label: 'HIGH RISK', value: 'HIGH RISK' },
      { label: 'UNKNOWN', value: 'UNKNOWN' },
    ]);
    this.updateFilterOptions('citizenImpact', [{ label: 'All', value: '' }]);
  }

  updateFilterOptions(
    filterId: string,
    options: { label: string; value: string }[],
  ): void {
    this.tableFilters.update((filters) =>
      filters.map((filter) => {
        if (filter.id !== filterId) return filter;
        const selectedValue = filter.value;
        const newLabel =
          selectedValue && selectedValue !== '' && selectedValue !== 'All'
            ? `${filter.label.split(':')[0]}: ${options.find((opt) => opt.value === selectedValue)?.label || selectedValue}`
            : `${filter.label.split(':')[0]}: All`;
        return { ...filter, options, label: newLabel };
      }),
    );
  }

  // Load summary cards data only
  loadSummaryCards() {
    if (!this.ministryId) {
      console.error('Ministry ID is required');
      return;
    }

    this.apiService.getMinistryDetailById(this.ministryId).subscribe({
      next: (response: ApiResponse<any>) => {
        if (response.isSuccessful && response.data) {
          // Extract summary data from API response
          const summaryData = {
            totalAssets: response.data.totalAssets || 0,
            totalIncidents: response.data.totalIncidents || 0,
            openIncidents: response.data.openIncidents || 0,
            highSeverityOpenIncidents:
              response.data.highSeverityOpenIncidents || 0,
          };

          // Update summary cards with API data
          this.updateSummaryCards(summaryData);
        } else {
          console.error('API Error:', response.message);
          // Reset summary cards on error
          this.updateSummaryCards({
            totalAssets: 0,
            totalIncidents: 0,
            openIncidents: 0,
            highSeverityOpenIncidents: 0,
          });
        }
      },
      error: (error) => {
        console.error('Error loading summary cards:', error);
        // Reset summary cards on error
        this.updateSummaryCards({
          totalAssets: 0,
          totalIncidents: 0,
          openIncidents: 0,
          highSeverityOpenIncidents: 0,
        });
      },
    });
  }

  loadAssets(searchParams: HttpParams) {
    if (!this.ministryId) {
      console.error('Ministry ID is required');
      return;
    }

    this.isLoading.set(true);

    // Use all params from table (includes PageNumber, PageSize, SearchTerm, SortBy, and filter values)
    // Table emits searchParams with filter paramKey/value when user selects filters
    let apiParams = new HttpParams();
    searchParams.keys().forEach((key) => {
      const values = searchParams.getAll(key);
      (values ?? []).forEach((value) => {
        if (value != null) apiParams = apiParams.append(key, value);
      });
    });

    // Use getAssestByMinistry API for table data
    this.apiService.getAssestByMinistry(apiParams, this.ministryId).subscribe({
      next: (response: ApiResponse<any>) => {
        this.isLoading.set(false);
        if (response.isSuccessful && response.data) {
          // Set ministry name from API response (breadcrumb & title)
          const name =
            response.data.ministryDepartment ??
            response.data.data?.[0]?.ministryDepartment ??
            'Ministry of Health';
          this.ministryName.set(name);
          this.breadcrumbService.setCurrentLabel(name);

          // Map API response to AssetDetail format
          const assets: AssetDetail[] = this.mapApiResponseToAssetDetails(
            response.data,
          );
          this.assetDetails.set(assets);
          this.setServiceAssetOptionsFromAssets(assets);

          // Set total items for pagination
          if (response.data?.totalCount !== undefined) {
            this.totalItems.set(response.data.totalCount);
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            this.totalItems.set(response.data.data.length);
          } else if (Array.isArray(response.data)) {
            this.totalItems.set(response.data.length);
          }

          // Update table config with new data
          this.tableConfig.update((config) => ({
            ...config,
            data: assets.map((asset) => ({
              ...asset,
              highSeverityText:
                typeof asset.highSeverityIncidents === 'number'
                  ? `Critical Severity: ${asset.highSeverityIncidents}`
                  : 'Critical Severity: N/A',
            })),
          }));
        } else {
          console.error('API Error:', response.message);
          this.assetDetails.set([]);
          this.totalItems.set(0);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error loading assets:', error);
        this.assetDetails.set([]);
        this.totalItems.set(0);
      },
    });
  }

  private mapApiResponseToAssetDetails(data: any): AssetDetail[] {
    // Handle different response structures
    let assetsArray: any[] = [];

    if (Array.isArray(data)) {
      assetsArray = data;
    } else if (data?.data && Array.isArray(data.data)) {
      assetsArray = data.data;
    } else if (data?.items && Array.isArray(data.items)) {
      assetsArray = data.items;
    }

    return assetsArray.map((item: any) => {
      // Ministry/Department: Use department if available, otherwise use ministryDepartment
      const ministryDepartment = item.ministryDepartment || 'N/A';
      const department =
        item.department && item.department.trim() !== ''
          ? item.department
          : 'N/A';

      // Website/Application: Use asset name from API, full assetUrl as link below
      const websiteApplication =
        item.assetName ||
        item.websiteApplication ||
        item.websiteName ||
        item.name ||
        'N/A';
      const assetUrl = item.assetUrl || '';
      // Use full assetUrl for the link href and display
      const websiteUrl = assetUrl || 'N/A';

      // Current Status: currentStatus as badge, lastChecked as subtext (short form, no "Checked:" prefix)
      const currentStatus = item.currentStatus || 'N/A';
      let currentStatusChecked = 'N/A';
      if (item.lastChecked) {
        try {
          const checkedDate = new Date(item.lastChecked);
          const now = new Date();
          const diffMs = now.getTime() - checkedDate.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutes = Math.floor(diffMs / (1000 * 60));

          if (diffHours > 24) {
            const diffDays = Math.floor(diffHours / 24);
            currentStatusChecked =
              diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
          } else if (diffHours > 0) {
            currentStatusChecked =
              diffHours === 1 ? '1 hr ago' : `${diffHours} hrs ago`;
          } else if (diffMinutes > 0) {
            currentStatusChecked =
              diffMinutes === 1 ? '1 min ago' : `${diffMinutes} mins ago`;
          } else {
            currentStatusChecked = 'just now';
          }
        } catch {
          currentStatusChecked = 'N/A';
        }
      }

      // Last Outage (short form: "5 mins ago", "2 days ago", etc.)
      const lastOutage = this.formatLastOutageShort(item.lastOutage);


      // Current Health: healthStatus with icon, healthIndex as percentage with "Health Index: " prefix
      const healthStatus = item.healthStatus || 'Unknown';
      const healthIndex =
        item.healthIndex !== undefined && item.healthIndex !== null
          ? item.healthIndex
          : null;
      const healthPercentage =
        healthIndex !== null
          ? `Health Index: ${healthIndex}%`
          : 'Health Index: N/A';

      // Performance Status
      const performanceStatus = item.performanceStatus || 'N/A';
      const performanceIndex =
        item.performanceIndex !== undefined && item.performanceIndex !== null
          ? item.performanceIndex
          : null;
      const performancePercentage =
        performanceIndex !== null
          ? `Performance Index: ${performanceIndex}%`
          : 'Performance Index: N/A';

      // Compliance Status
      const complianceStatus = item.complianceStatus || 'N/A';
      const complianceIndex =
        item.complianceIndex !== undefined && item.complianceIndex !== null
          ? item.complianceIndex
          : null;
      const compliancePercentage =
        complianceIndex !== null
          ? `Compliance Index: ${complianceIndex}%`
          : 'Compliance Index: N/A';

      // Risk Exposure Index (capitalized for display)
      const riskExposureIndex = this.toTitleCase(item.riskExposureIndex || 'N/A');

      // Citizen impact: badge = first part (LOW/HIGH/MEDIUM/UNKNOWN), subtext = part after " - " (e.g. "Supporting Services")
      const citizenImpactRaw = item.citizenImpactLevel || 'N/A';
      const dashIndex = String(citizenImpactRaw).indexOf(' - ');
      const citizenImpactLevel =
        dashIndex >= 0
          ? String(citizenImpactRaw).slice(0, dashIndex).trim() || 'N/A'
          : citizenImpactRaw;
      const citizenImpactLevelSubtext =
        dashIndex >= 0
          ? String(citizenImpactRaw)
              .slice(dashIndex + 3)
              .trim()
          : '';

      // Open Incidents: openIncidents as primary, highSeverityIncidents as secondary
      const openIncidents =
        item.openIncidents !== undefined && item.openIncidents !== null
          ? item.openIncidents
          : 'N/A';
      const highSeverityIncidents =
        item.highSeverityIncidents !== undefined &&
        item.highSeverityIncidents !== null
          ? item.highSeverityIncidents
          : 'N/A';

      return {
        id: item.id || item.assetId || 0,
        department: department,
        websiteName: websiteApplication,
        websiteUrl: websiteUrl,
        currentStatus: currentStatus,
        currentStatusChecked: currentStatusChecked,
        lastOutage: lastOutage,
        currentHealthStatus: healthStatus,
        currentHealthIcon: this.getHealthIcon(healthStatus),
        currentHealthPercentage: healthPercentage,
        healthIndex: healthIndex ?? undefined,
        performanceStatus: performanceStatus,
        performancePercentage: performancePercentage,
        performanceIndex: performanceIndex ?? undefined,
        complianceStatus: complianceStatus,
        compliancePercentage: compliancePercentage,
        complianceIndex: complianceIndex ?? undefined,
        riskExposureIndex: riskExposureIndex,
        citizenImpactLevel: citizenImpactLevel,
        citizenImpactLevelSubtext: citizenImpactLevelSubtext,
        openIncidents: openIncidents,
        highSeverityIncidents: highSeverityIncidents,
      };
    });
  }

  private updateSummaryCards(summaryData: {
    totalAssets: number;
    totalIncidents: number;
    openIncidents: number;
    highSeverityOpenIncidents: number;
  }) {
    this.summaryCards.set([
      {
        id: 1,
        value: summaryData.totalAssets.toString(),
        title: 'Total Assets',
        subTitle: 'Active Monitoring Across All Departments',
        linkText: 'View All >',
        linkPath: '/asset',
      },
      {
        id: 2,
        value: summaryData.totalIncidents.toString(),
        title: 'Total Incidents',
        subTitle: 'Incidents Across All Departments',
        linkText: 'View All Incidents >',
        linkPath: '/incidents',
        linkQueryParams: { MinistryId: this.ministryId?.toString() ?? '' },
      },
      {
        id: 3,
        value: summaryData.openIncidents.toString(),
        badge: `${summaryData.openIncidents}/${summaryData.totalIncidents}`,
        title: 'Open Incidents',
        subTitle: 'Active Unresolved Incidents',
        linkText: 'View Open Incidents >',
        linkPath: '/incidents',
        linkQueryParams: {
          MinistryId: this.ministryId?.toString() ?? '',
          Status: 'Open',
        },
      },
      {
        id: 4,
        value: summaryData.highSeverityOpenIncidents.toString(),
        badge: `${summaryData.highSeverityOpenIncidents}/${summaryData.openIncidents}`,
        badgeColor: 'red',
        title: 'High Severity Open Incidents',
        subTitle: 'Active High Severity Unresolved Incidents',
        linkText: 'View Open High Severity Incidents >',
        linkPath: '/incidents',
        linkQueryParams: {
          MinistryId: this.ministryId?.toString() ?? '',
          SeverityId: 'P2',
          Status: 'Open',
        },
      },
    ]);
  }

  /**
   * Format last outage for display: short form like dashboard ("5 mins ago", "2 hrs ago", "3 days ago").
   */
  private formatLastOutageShort(value: string | null | undefined): string {
    if (value == null || value === '') return 'N/A';
    const s = String(value).trim();
    if (!s) return 'N/A';
    // Try parsing as date and compute relative time in short form
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays > 0) return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        if (diffHours > 0) return diffHours === 1 ? '1 hr ago' : `${diffHours} hrs ago`;
        if (diffMinutes > 0) return diffMinutes === 1 ? '1 min ago' : `${diffMinutes} mins ago`;
        return 'just now';
      }
    } catch {
      // fall through to string normalization
    }
    // Normalize relative-time strings to short form
    return s
      .replace(/\b1 minute ago\b/gi, '1 min ago')
      .replace(/\b(\d+) minutes ago\b/gi, '$1 mins ago')
      .replace(/\b1 hour ago\b/gi, '1 hr ago')
      .replace(/\b(\d+) hours ago\b/gi, '$1 hrs ago')
      .replace(/\bJust now\b/gi, 'just now');
  }

  private toTitleCase(s: string): string {
    if (!s || s === 'N/A') return s || 'N/A';
    return s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  private getHealthIcon(healthStatus: string): string {
    const status = (healthStatus || '').toLowerCase();
    if (status.includes('healthy') || status.includes('good'))
      return 'check_circle';
    if (status.includes('critical') || status.includes('poor') || status.includes('down')) return 'error';
    if (status.includes('average') || status.includes('warning') || status.includes('fair')) return 'warning';
    return 'help_outline';
  }

  onAddAsset() {
    // Navigate to add digital assets page
    this.router.navigate(['/add-digital-assets']);
  }

  onAddService(): void {
    this.openServiceDialog('create');
  }

  onEditService(service: MinistryServiceItem, event?: Event): void {
    event?.stopPropagation();
    this.openServiceDialog('edit', service);
  }

  /** Navigate to service analytics / detail (GET /Service/{id}). */
  goToServiceDetail(service: MinistryServiceItem): void {
    if (!this.ministryId) return;
    this.router.navigate(['/service-detail'], {
      queryParams: { serviceId: service.id, ministryId: this.ministryId },
    });
  }

  private openServiceDialog(mode: 'create' | 'edit', service?: MinistryServiceItem): void {
    const dialogRef = this.dialog.open(ServiceDialogComponent, {
      panelClass: 'service-dialog-panel',
      disableClose: true,
      data: {
        mode,
        service: service
          ? { ...service, assetIds: Array.isArray(service.assetIds) ? service.assetIds : [] }
          : undefined,
        assetOptions: this.serviceAssetOptions(),
        serviceTypeOptions: this.serviceTypeOptions(),
      },
    });

    dialogRef.afterClosed().subscribe((result: ServiceDialogResult | null | undefined) => {
      if (!result) return;
      if (mode === 'create') {
        this.createService(result);
      } else if (service) {
        this.updateService(service.id, result);
      }

    });
  }

  onDetailTabChange(tabId: 'assets' | 'services'): void {
    this.activeDetailTab.set(tabId);
    if (tabId === 'services' && this.services().length === 0 && !this.servicesLoading()) {
      this.loadServices();
    }
  }

  private loadServices(): void {
    if (!this.ministryId) return;
    this.servicesLoading.set(true);
    this.servicesError.set(null);

    this.apiService.getServicesByMinistry(this.ministryId).subscribe({
      next: (response: ApiResponse<MinistryServicesResponseData>) => {
        this.servicesLoading.set(false);
        if (!response?.isSuccessful || !response?.data) {
          this.servicesError.set(response?.message ?? 'Failed to load services');
          this.services.set([]);
          return;
        }

        const payload = response.data;
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        this.services.set(rows.map((r) => this.mapServiceRow(r)));

        const s = payload?.summary;
        const totalServices = Number(s?.totalServices ?? rows.length ?? 0);
        const totalMappedAssetsCount = Number(s?.totalMappedAssetsCount ?? 0);
        const digitalServicePercentage = s?.digitalServicePercentage ?? '0.00%';
        const overallSuccessRate = s?.overallSuccessRate ?? '0.00%';

        this.servicesSummaryCards.set([
          {
            id: 1,
            value: String(totalMappedAssetsCount),
            title: 'Total Assets',
            subTitle: 'Active monitoring across all departments',
            linkText: 'View all >',
            linkPath: '/asset',
          },
          {
            id: 2,
            value: String(totalServices),
            title: 'Total Services',
            subTitle: `Digital Services: ${digitalServicePercentage}`,
            linkText: 'View all services >',
            linkPath: '#',
          },
          {
            id: 3,
            value: overallSuccessRate,
            title: 'Overall Success Rate',
            subTitle: 'Aggregated completion across services',
            linkText: 'View details >',
            linkPath: '#',
          },
          {
            id: 4,
            value: digitalServicePercentage,
            title: 'Digital Service %',
            subTitle: 'Digital service coverage',
            linkText: 'View details >',
            linkPath: '#',
          },
        ]);
      },
      error: (err) => {
        this.servicesLoading.set(false);
        this.servicesError.set(err?.message ?? 'Failed to load services');
        this.services.set([]);
      },
    });
  }

  private mapServiceRow(row: ApiMinistryServiceItem): MinistryServiceItem {
    const mode = String(row.serviceModeName ?? '').toLowerCase();
    const isActive = row.isActive ?? (mode.includes('digital') || mode.includes('automated'));
    const maturityRaw = String(row.digitalServicePercentage ?? '').trim();
    const parsedMaturity = Number(maturityRaw.replace('%', '').trim());
    const hasMaturity =
      maturityRaw !== '' &&
      maturityRaw.toUpperCase() !== 'N/A' &&
      Number.isFinite(parsedMaturity);
    const createdAt = row.createdAt
      ? new Date(row.createdAt).toLocaleDateString('en-GB')
      : 'N/A';

    return {
      id: Number(row.id ?? 0),
      serviceName: row.serviceName ?? 'N/A',
      serviceTypeId: row.serviceTypeId ?? null,
      serviceType: row.serviceTypeName ?? 'N/A',
      serviceMode: row.serviceModeName ?? 'N/A',
      status: isActive ? 'Active' : 'Inactive',
      digitalMaturity: hasMaturity ? Math.max(0, Math.min(100, parsedMaturity)) : null,
      digitalMaturityText: hasMaturity ? `${Math.max(0, Math.min(100, parsedMaturity))}%` : 'N/A',
      assetIds: Array.isArray(row.assetIds)
        ? row.assetIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
        : [],
      assetsCount: Number(row.assetCount ?? 0),
      stepsCount: Number(row.stepCount ?? 0),
      createdAt,
      createdBy: row.createdBy ?? 'N/A',
      description: row.description ?? '',
    };
  }

  private loadServiceAssetOptions(): void {
    const currentAssets = this.assetDetails();
    if (Array.isArray(currentAssets) && currentAssets.length > 0) {
      this.setServiceAssetOptionsFromAssets(currentAssets);
      return;
    }
    if (!this.ministryId) return;
    const params = new HttpParams().set('PageNumber', '1').set('PageSize', '300');
    this.apiService.getAssestByMinistry(params, this.ministryId).subscribe({
      next: (response: ApiResponse<any>) => {
        const rows = Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data)
            ? response.data
            : [];
        const options = rows
          .map((a: any) => ({
            label: String(a.assetName ?? a.websiteApplication ?? a.name ?? '').trim(),
            value: Number(a.id ?? a.assetId),
          }))
          .filter(
            (x: { label: string; value: number }) =>
              !!x.label &&
              Number.isFinite(x.value) &&
              x.value > 0 &&
              x.label.toLowerCase() !== 'select assets',
          );
        this.serviceAssetOptions.set(options);
      },
      error: () => {
        this.serviceAssetOptions.set([]);
      },
    });
  }

  private setServiceAssetOptionsFromAssets(assets: AssetDetail[]): void {
    const options = assets
      .map((a) => ({
        label: String(a.websiteName ?? '').trim(),
        value: Number(a.id),
      }))
      .filter(
        (x) =>
          !!x.label &&
          Number.isFinite(x.value) &&
          x.value > 0 &&
          x.label.toLowerCase() !== 'select assets',
      );
    const unique = new Map<number, { label: string; value: number }>();
    options.forEach((o) => unique.set(o.value, o));
    this.serviceAssetOptions.set(Array.from(unique.values()));
  }

  private createService(result: ServiceDialogResult): void {
    if (!this.ministryId) return;
    const payload: CreateServiceRequest = {
      ministryId: this.ministryId,
      serviceName: result.serviceName,
      description: result.description,
      serviceTypeId: result.serviceTypeId,
      assetIds: Array.isArray(result.assetIds) ? result.assetIds.map((x) => Number(x)) : [],
      manualSteps: [],
    };

    this.apiService.createService(payload).subscribe({
      next: (response: ApiResponse<any>) => {
        if (!response?.isSuccessful) {
          const message = response?.message ?? 'Failed to create service';
          this.servicesError.set(null);
          this.toastr.error(message, 'Add Service');
          this.refreshServicesSection();
          return;
        }
        this.servicesError.set(null);
        this.toastr.success(response?.message ?? 'Service created successfully.', 'Add Service');
        this.refreshServicesSection();
      },
      error: (err) => {
        const message = this.extractApiErrorMessage(err, 'Failed to create service');
        this.servicesError.set(null);
        this.toastr.error(message, 'Add Service');
        this.refreshServicesSection();
      },
    });
  }

  private updateService(serviceId: number, result: ServiceDialogResult): void {
    if (!this.ministryId) return;
    const payload: CreateServiceRequest = {
      ministryId: this.ministryId,
      serviceName: result.serviceName,
      description: result.description,
      serviceTypeId: result.serviceTypeId,
      assetIds: Array.isArray(result.assetIds) ? result.assetIds.map((x) => Number(x)) : [],
      manualSteps: [],
    };

    this.apiService.updateService(serviceId, payload).subscribe({
      next: (response: ApiResponse<any>) => {
        if (!response?.isSuccessful) {
          const message = response?.message ?? 'Failed to update service';
          this.servicesError.set(null);
          this.toastr.error(message, 'Update Service');
          this.refreshServicesSection();
          return;
        }
        this.servicesError.set(null);
        this.toastr.success(response?.message ?? 'Service updated successfully.', 'Update Service');
        this.refreshServicesSection();
      },
      error: (err) => {
        const message = this.extractApiErrorMessage(err, 'Failed to update service');
        this.servicesError.set(null);
        this.toastr.error(message, 'Update Service');
        this.refreshServicesSection();
      },
    });
  }

  private refreshServicesSection(): void {
    this.loadServices();
    this.loadSummaryCards();
  }

  private extractApiErrorMessage(err: any, fallback: string): string {
    const msg = err?.error?.message ?? err?.message;
    return typeof msg === 'string' && msg.trim().length > 0 ? msg : fallback;
  }

}
