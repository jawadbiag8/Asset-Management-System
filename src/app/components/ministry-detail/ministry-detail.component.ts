import { Component, signal, computed, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  TableConfig,
  TableColumn,
  FilterPill,
} from '../reusable/reusable-table/reusable-table.component';
import { ApiService, ApiResponse } from '../../services/api.service';

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
  performanceStatus: string;
  performancePercentage: string;
  complianceStatus: string;
  compliancePercentage: string;
  riskExposureIndex: string;
  citizenImpactLevel: string;
  citizenImpactLevelSubtext: string;
  openIncidents: number | string;
  highSeverityIncidents: number | string;
}

@Component({
  selector: 'app-ministry-detail',
  standalone: false,
  templateUrl: './ministry-detail.component.html',
  styleUrl: './ministry-detail.component.scss',
})
export class MinistryDetailComponent implements OnInit {
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
      linkPath: '/dashboard',
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
      linkQueryParams: { MinistryId: '', SeverityId: 'P2', StatusId: '14' },
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
  ) {}

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    searchPlaceholder: 'Search Assets',
    serverSideSearch: true,
    defaultPageSize: 10,
    columns: [
      {
        key: 'details',
        header: 'Details',
        cellType: 'icon',
        iconUrl: '/assets/info-icon.svg',
        iconBgColor: 'transparent',
        sortable: false,
        onClick: (row: AssetDetail) => {
          this.router.navigate(['/view-assets-detail'], {
            queryParams: {
              id: row.id,
              ministryId: this.ministryId,
            },
            queryParamsHandling: '',
          });
        },
      },
      {
        key: 'department',
        header: 'Department',
        cellType: 'text',
        primaryField: 'department',
        sortable: true,
      },
      {
        key: 'websiteApplication',
        header: 'Asset',
        cellType: 'two-line',
        primaryField: 'websiteName',
        secondaryField: 'websiteUrl',
        linkField: 'websiteUrl',
        sortable: true,
      },
      {
        key: 'currentStatus',
        header: 'Status',
        cellType: 'badge-with-subtext',
        badgeField: 'currentStatus',
        subtextField: 'currentStatusChecked',
        badgeColor: (row: any) => {
          const status = (row.currentStatus || '').toUpperCase();
          if (status === 'UP') {
            return 'var(--color-green-light)';
          } else if (status === 'DOWN') {
            return 'var(--color-red-light)';
          }
          return 'var(--color-bg-quaternary)';
        },
        badgeTextColor: (row: any) => {
          const status = (row.currentStatus || '').toUpperCase();
          if (status === 'UP') {
            return 'var(--color-green)';
          } else if (status === 'DOWN') {
            return 'var(--color-red)';
          }
          return 'var(--color-text-tertiary)';
        },
        sortable: true,
      },
      {
        key: 'lastOutage',
        header: 'OUTAGE',
        cellType: 'text',
        primaryField: 'lastOutage',
        sortable: true,
      },
      {
        key: 'currentHealth',
        header: 'HEALTH',
        cellType: 'health-status',
        healthStatusField: 'currentHealthStatus',
        healthIconField: 'currentHealthIcon',
        healthPercentageField: 'currentHealthPercentage',
        sortable: true,
        sortByKey: 'healthindex',
      },
      {
        key: 'performanceStatus',
        header: 'PERFORMANCE',
        cellType: 'text-with-color',
        primaryField: 'performanceStatus',
        secondaryField: 'performancePercentage',
        textColor: (row: any) => {
          const status = (row.performanceStatus || '').toLowerCase();
          if (status.includes('performing well') || status.includes('well')) {
            return 'success';
          } else if (status.includes('average')) {
            return 'warning';
          } else if (status.includes('poor')) {
            return 'danger';
          } else if (status.includes('unknown') || status === 'n/a') {
            return 'default';
          }
          return 'default';
        },
        sortable: true,
      },
      {
        key: 'complianceStatus',
        header: 'COMPLIANCE',
        cellType: 'text-with-color',
        primaryField: 'complianceStatus',
        secondaryField: 'compliancePercentage',
        textColor: (row: any) => {
          const status = (row.complianceStatus || '').toLowerCase();
          if (status.includes('high compliance') || status.includes('high')) {
            return 'success';
          } else if (
            status.includes('medium compliance') ||
            status.includes('medium')
          ) {
            return 'warning';
          } else if (
            status.includes('low compliance') ||
            status.includes('low')
          ) {
            return 'danger';
          } else if (status.includes('unknown') || status === 'n/a') {
            return 'default';
          }
          return 'default';
        },
        sortable: true,
      },
      {
        key: 'riskExposureIndex',
        header: 'RISK ',
        cellType: 'text-with-color',
        primaryField: 'riskExposureIndex',
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
      },
      {
        key: 'citizenImpactLevel',
        header: 'CITIZEN IMPACT',
        cellType: 'badge-with-subtext',
        badgeField: 'citizenImpactLevel',
        subtextField: 'citizenImpactLevelSubtext',
        badgeColor: (row: any) => {
          const impact = (row.citizenImpactLevel || '').toUpperCase();
          if (impact === 'LOW' || impact.includes('LOW')) {
            return 'var(--color-green-light)';
          } else if (impact === 'MEDIUM' || impact.includes('MEDIUM')) {
            return 'var(--color-orange-light)';
          } else if (impact === 'HIGH' || impact.includes('HIGH')) {
            return 'var(--color-red-light)';
          }
          return 'var(--color-bg-quaternary)';
        },
        badgeTextColor: (row: any) => {
          const impact = (row.citizenImpactLevel || '').toUpperCase();
          if (impact === 'LOW' || impact.includes('LOW')) {
            return 'var(--color-green)';
          } else if (impact === 'MEDIUM' || impact.includes('MEDIUM')) {
            return 'var(--color-orange-dark)';
          } else if (impact === 'HIGH' || impact.includes('HIGH')) {
            return 'var(--color-red)';
          }
          return 'var(--color-text-tertiary)';
        },
        sortable: true,
      },
      {
        key: 'openIncidents',
        header: 'OPEN INCIDENTS',
        cellType: 'two-line',
        primaryField: 'openIncidents',
        secondaryField: 'highSeverityText',
        sortable: true,
      },
    ],
    data: [],
  });

  assetDetails = signal<AssetDetail[]>([]);

  // Computed signal to keep table config in sync with data
  tableConfigWithData = computed<TableConfig>(() => {
    const data = this.assetDetails().map((asset) => ({
      ...asset,
      highSeverityText: `Critical Severity: ${asset.highSeverityIncidents}`,
    }));
    return {
      ...this.tableConfig(),
      data: data,
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
        // Trigger initial load when ministryId is available
        // The table component will emit searchQuery on init, which will call loadAssets
      }
    });
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

          // Map API response to AssetDetail format
          const assets: AssetDetail[] = this.mapApiResponseToAssetDetails(
            response.data,
          );
          this.assetDetails.set(assets);

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

      // Performance Status: performanceStatus as primary, performanceIndex as secondary with "Performance Index: " prefix
      const performanceStatus = item.performanceStatus || 'N/A';
      const performanceIndex =
        item.performanceIndex !== undefined && item.performanceIndex !== null
          ? item.performanceIndex
          : null;
      const performancePercentage =
        performanceIndex !== null
          ? `Performance Index: ${performanceIndex}%`
          : 'Performance Index: N/A';

      // Compliance Status: complianceStatus as primary, complianceIndex as secondary with "Compliance Index: " prefix
      const complianceStatus = item.complianceStatus || 'N/A';
      const complianceIndex =
        item.complianceIndex !== undefined && item.complianceIndex !== null
          ? item.complianceIndex
          : null;
      const compliancePercentage =
        complianceIndex !== null
          ? `Compliance Index: ${complianceIndex}%`
          : 'Compliance Index: N/A';

      // Risk Exposure Index (uppercase for display)
      const riskExposureIndex = (item.riskExposureIndex || 'N/A').toUpperCase();

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
        websiteUrl: websiteUrl, // Full URL for link href and display
        currentStatus: currentStatus,
        currentStatusChecked: currentStatusChecked,
        lastOutage: lastOutage,
        currentHealthStatus: healthStatus,
        currentHealthIcon: this.getHealthIcon(healthStatus),
        currentHealthPercentage: healthPercentage,
        performanceStatus: performanceStatus,
        performancePercentage: performancePercentage,
        complianceStatus: complianceStatus,
        compliancePercentage: compliancePercentage,
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
        linkPath: '/dashboard',
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
          StatusId: '14',
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

  private getHealthIcon(healthStatus: string): string {
    const status = (healthStatus || '').toLowerCase();
    if (status.includes('healthy') || status.includes('good')) {
      return 'check_circle';
    } else if (status.includes('critical') || status.includes('down')) {
      return 'error';
    } else if (status.includes('average') || status.includes('warning')) {
      return 'warning';
    }
    return 'help';
  }

  onAddAsset() {
    // Navigate to add digital assets page
    this.router.navigate(['/add-digital-assets']);
  }
}
