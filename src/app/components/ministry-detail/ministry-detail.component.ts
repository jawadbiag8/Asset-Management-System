import {
  Component,
  signal,
  computed,
  AfterViewInit,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import {
  TableConfig,
  TableColumn,
  FilterPill,
} from '../reusable/reusable-table/reusable-table.component';
import { ApiService, ApiResponse } from '../../services/api.service';

export interface AssetDetail {
  id: number;
  ministry: string;
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
  openIncidents: number;
  highSeverityIncidents: number;
}

@Component({
  selector: 'app-ministry-detail',
  standalone: false,
  templateUrl: './ministry-detail.component.html',
  styleUrl: './ministry-detail.component.scss',
})
export class MinistryDetailComponent implements OnInit, AfterViewInit {
  tableFilters = signal<FilterPill[]>([
    {
      id: 'status',
      label: 'Status: All',
      value: 'All',
      paramKey: 'status',
      options: [
        { label: 'All', value: 'All' },
        { label: 'Up', value: 'Up' },
        { label: 'Down', value: 'Down' },
      ],
    },
    {
      id: 'health',
      label: 'Health: All',
      value: 'All',
      paramKey: 'health',
      options: [
        { label: 'All', value: 'All' },
        { label: 'Healthy', value: 'Healthy' },
        { label: 'Critical', value: 'Critical' },
        { label: 'Unknown', value: 'Unknown' },
      ],
    },
    {
      id: 'performance',
      label: 'Performance: All',
      value: 'All',
      paramKey: 'performance',
      options: [
        { label: 'All', value: 'All' },
        { label: 'Performing Well', value: 'Performing Well' },
        { label: 'Average', value: 'Average' },
        { label: 'Poor', value: 'Poor' },
      ],
    },
    {
      id: 'compliance',
      label: 'Compliance: All',
      value: 'All',
      paramKey: 'compliance',
      options: [
        { label: 'All', value: 'All' },
        { label: 'High Compliance', value: 'High Compliance' },
        { label: 'Medium Compliance', value: 'Medium Compliance' },
        { label: 'Low Compliance', value: 'Low Compliance' },
      ],
    },
    {
      id: 'riskIndex',
      label: 'Risk Index: All',
      value: 'All',
      paramKey: 'riskIndex',
      options: [
        { label: 'All', value: 'All' },
        { label: 'LOW RISK', value: 'LOW RISK' },
        { label: 'MEDIUM RISK', value: 'MEDIUM RISK' },
        { label: 'HIGH RISK', value: 'HIGH RISK' },
      ],
    },
    {
      id: 'citizenImpact',
      label: 'Citizen Impact: All',
      value: 'All',
      paramKey: 'citizenImpact',
      options: [
        { label: 'All', value: 'All' },
        { label: 'LOW', value: 'LOW' },
        { label: 'MEDIUM', value: 'MEDIUM' },
        { label: 'HIGH', value: 'HIGH' },
      ],
    },
  ]);

  summaryCards = signal([
    {
      id: 1,
      value: '7',
      title: 'Total Assets',
      subTitle: 'Active monitoring across all departments',
      linkText: 'View All >',
    },
    {
      id: 2,
      value: '14',
      title: 'Total incidents',
      subTitle: 'Incidents across all departments',
      linkText: 'View all incidents >',
    },
    {
      id: 3,
      value: '8',
      badge: '8/14',
      title: 'Open incidents',
      subTitle: 'Active unresolved incidents',
      linkText: 'View open incidents >',
    },
    {
      id: 4,
      value: '2',
      badge: '2/8',
      badgeColor: 'red',
      title: 'High severity open incidents',
      subTitle: 'Active high severity unresolved incidents',
      linkText: 'View critical assets >',
    },
  ]);

  @ViewChild('tableContainer', { static: false }) tableContainer!: ElementRef;

  ministryId: number | null = null;
  isLoading = signal<boolean>(false);
  totalItems = signal<number>(0);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
  ) {}

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    searchPlaceholder: 'Search assets',
    serverSideSearch: true,
    defaultPageSize: 10,
    columns: [
      {
        key: 'analyze',
        header: 'ANALYZE',
        cellType: 'icon',
        iconName: 'bar_chart',
        iconColor: 'var(--color-blue-dark)',
        iconBgColor: 'var(--color-blue-light)',
        sortable: true,
        onClick: (row: AssetDetail) => {
          this.router.navigate(['/view-assets-detail'], {
            queryParams: { id: row.id },
          });
        },
      },
      {
        key: 'ministryDepartment',
        header: 'MINISTRY / DEPARTMENT',
        cellType: 'two-line',
        primaryField: 'ministry',
        secondaryField: 'department',
        sortable: true,
      },
      {
        key: 'websiteApplication',
        header: 'WEBSITE / APPLICATION',
        cellType: 'link',
        primaryField: 'websiteName',
        linkField: 'websiteUrl',
        sortable: true,
      },
      {
        key: 'currentStatus',
        header: 'CURRENT STATUS',
        cellType: 'badge-with-subtext',
        badgeField: 'currentStatus',
        subtextField: 'currentStatusChecked',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true,
      },
      {
        key: 'lastOutage',
        header: 'LAST OUTAGE',
        cellType: 'text',
        primaryField: 'lastOutage',
        sortable: true,
      },
      {
        key: 'currentHealth',
        header: 'CURRENT HEALTH',
        cellType: 'health-status',
        healthStatusField: 'currentHealthStatus',
        healthIconField: 'currentHealthIcon',
        healthPercentageField: 'currentHealthPercentage',
        sortable: true,
      },
      {
        key: 'performanceStatus',
        header: 'PERFORMANCE STATUS',
        cellType: 'two-line',
        primaryField: 'performanceStatus',
        secondaryField: 'performancePercentage',
        sortable: true,
      },
      {
        key: 'complianceStatus',
        header: 'COMPLIANCE STATUS',
        cellType: 'two-line',
        primaryField: 'complianceStatus',
        secondaryField: 'compliancePercentage',
        sortable: true,
      },
      {
        key: 'riskExposureIndex',
        header: 'RISK EXPOSURE INDEX',
        cellType: 'badge',
        badgeField: 'riskExposureIndex',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true,
      },
      {
        key: 'citizenImpactLevel',
        header: 'CITIZEN IMPACT LEVEL',
        cellType: 'badge',
        badgeField: 'citizenImpactLevel',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true,
      },
      {
        key: 'openIncidents',
        header: 'OPEN INCIDENTS',
        cellType: 'badge-with-subtext',
        badgeField: 'openIncidents',
        subtextField: 'highSeverityText',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
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
      highSeverityText: `High severity: ${asset.highSeverityIncidents}`,
    }));
    return {
      ...this.tableConfig(),
      data: data,
    };
  });

  ngOnInit() {
    // Get ministryId from query params
    this.route.queryParams.subscribe((params) => {
      const id = params['ministryId'];
      if (id) {
        this.ministryId = +id;
        // Trigger initial load when ministryId is available
        // The table component will emit searchQuery on init, which will call loadAssets
      }
    });
  }

  loadAssets(searchParams: HttpParams) {
    if (!this.ministryId) {
      console.error('Ministry ID is required');
      return;
    }

    this.isLoading.set(true);

    // Convert pageNumber to page for API
    const pageNumber = searchParams.get('pageNumber') || '1';
    const pageSize = searchParams.get('pageSize') || '10';
    const search = searchParams.get('search') || '';

    // Build new HttpParams with correct parameter names
    let apiParams = new HttpParams()
      .set('page', pageNumber)
      .set('pageSize', pageSize);

    if (search) {
      apiParams = apiParams.set('search', search);
    }

    // Add filter parameters
    this.tableFilters().forEach((filter) => {
      if (
        filter.paramKey &&
        filter.value &&
        filter.value !== '' &&
        filter.value !== 'All'
      ) {
        apiParams = apiParams.set(filter.paramKey, filter.value);
      }
    });

    this.apiService
      .getMinistryDetailById(apiParams, this.ministryId)
      .subscribe({
        next: (response: ApiResponse<any>) => {
          this.isLoading.set(false);
          if (response.isSuccessful && response.data) {
            // Extract summary data from API response
            const summaryData = {
              totalAssets: response.data.totalAssets || 0,
              totalIncidents: response.data.totalIncidents || 0,
              openIncidents: response.data.openIncidents || 0,
              highSeverityOpenIncidents: response.data.highSeverityOpenIncidents || 0,
            };

            // Update summary cards with API data
            this.updateSummaryCards(summaryData);

            // Map API response to AssetDetail format
            const assets: AssetDetail[] = this.mapApiResponseToAssetDetails(
              response.data,
            );
            this.assetDetails.set(assets);

            // Set total items for pagination
            if (response.data.totalCount !== undefined) {
              this.totalItems.set(response.data.totalCount);
            } else if (Array.isArray(response.data.data)) {
              this.totalItems.set(response.data.data.length);
            } else if (Array.isArray(response.data)) {
              this.totalItems.set(response.data.length);
            }

            // Update table config with new data
            this.tableConfig.update((config) => ({
              ...config,
              data: assets.map((asset) => ({
                ...asset,
                highSeverityText: `High severity: ${asset.highSeverityIncidents}`,
              })),
            }));

            // Apply badge colors after data is loaded
            setTimeout(() => {
              this.applyBadgeColors();
            }, 0);
          } else {
            console.error('API Error:', response.message);
            this.assetDetails.set([]);
            this.totalItems.set(0);
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
          this.isLoading.set(false);
          console.error('Error loading assets:', error);
          this.assetDetails.set([]);
          this.totalItems.set(0);
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

    return assetsArray.map((item: any) => ({
      id: item.id || item.assetId || 0,
      ministry: item.ministry || item.ministryName || '',
      department: item.department || item.departmentName || '',
      websiteName: item.websiteName || item.name || 'Department Website',
      websiteUrl: item.websiteUrl || item.url || '',
      currentStatus: item.currentStatus || item.status || 'Unknown',
      currentStatusChecked: item.currentStatusChecked || item.statusChecked || '',
      lastOutage: item.lastOutage || item.lastOutageTime || '',
      currentHealthStatus: item.currentHealthStatus || item.healthStatus || 'Unknown',
      currentHealthIcon: this.getHealthIcon(item.currentHealthStatus || item.healthStatus),
      currentHealthPercentage: item.currentHealthPercentage || item.healthIndex || '',
      performanceStatus: item.performanceStatus || item.performance || '',
      performancePercentage: item.performancePercentage || item.performanceIndex || '',
      complianceStatus: item.complianceStatus || item.compliance || '',
      compliancePercentage: item.compliancePercentage || item.complianceIndex || '',
      riskExposureIndex: item.riskExposureIndex || item.riskIndex || 'UNKNOWN',
      citizenImpactLevel: item.citizenImpactLevel || item.citizenImpact || 'LOW',
      openIncidents: item.openIncidents || item.totalIncidents || 0,
      highSeverityIncidents: item.highSeverityIncidents || item.highSeverityOpenIncidents || 0,
    }));
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
        subTitle: 'Active monitoring across all departments',
        linkText: 'View All >',
      },
      {
        id: 2,
        value: summaryData.totalIncidents.toString(),
        title: 'Total incidents',
        subTitle: 'Incidents across all departments',
        linkText: 'View all incidents >',
      },
      {
        id: 3,
        value: summaryData.openIncidents.toString(),
        badge: `${summaryData.openIncidents}/${summaryData.totalIncidents}`,
        title: 'Open incidents',
        subTitle: 'Active unresolved incidents',
        linkText: 'View open incidents >',
      },
      {
        id: 4,
        value: summaryData.highSeverityOpenIncidents.toString(),
        badge: `${summaryData.highSeverityOpenIncidents}/${summaryData.openIncidents}`,
        badgeColor: 'red',
        title: 'High severity open incidents',
        subTitle: 'Active high severity unresolved incidents',
        linkText: 'View critical assets >',
      },
    ]);
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

  ngAfterViewInit() {
    // Apply colors to badges based on values
    setTimeout(() => {
      this.applyBadgeColors();
    }, 0);
  }

  private applyBadgeColors() {
    if (!this.tableContainer) return;

    // Apply colors to CURRENT STATUS badges
    const statusBadges = this.tableContainer.nativeElement.querySelectorAll(
      '.assets-table td[mat-cell]:nth-child(4) .badge',
    );
    statusBadges.forEach((badge: HTMLElement) => {
      const text = badge.textContent?.trim();
      if (text === 'Up') {
        badge.style.backgroundColor = 'var(--color-green-light)';
        badge.style.color = 'var(--color-green-dark)';
      } else if (text === 'Down') {
        badge.style.backgroundColor = 'var(--color-red-light)';
        badge.style.color = 'var(--color-red)';
      }
    });

    // Apply colors to RISK EXPOSURE INDEX badges
    const riskBadges = this.tableContainer.nativeElement.querySelectorAll(
      '.assets-table td[mat-cell]:nth-child(9) .badge',
    );
    riskBadges.forEach((badge: HTMLElement) => {
      const text = badge.textContent?.trim();
      if (text === 'LOW RISK') {
        badge.style.backgroundColor = 'var(--color-green-light)';
        badge.style.color = 'var(--color-green-dark)';
      } else if (text === 'MEDIUM RISK') {
        badge.style.backgroundColor = 'var(--color-yellow-light)';
        badge.style.color = 'var(--color-yellow-dark)';
      } else if (text === 'HIGH RISK') {
        badge.style.backgroundColor = 'var(--color-red-light)';
        badge.style.color = 'var(--color-red)';
      } else if (text === 'UNKNOWN') {
        badge.style.backgroundColor = 'var(--color-gray-light)';
        badge.style.color = 'var(--color-gray-dark)';
      }
    });

    // Apply colors to CITIZEN IMPACT LEVEL badges
    const impactBadges = this.tableContainer.nativeElement.querySelectorAll(
      '.assets-table td[mat-cell]:nth-child(10) .badge',
    );
    impactBadges.forEach((badge: HTMLElement) => {
      const text = badge.textContent?.trim();
      if (text === 'LOW') {
        badge.style.backgroundColor = 'var(--color-green-light)';
        badge.style.color = 'var(--color-green-dark)';
      } else if (text === 'MEDIUM') {
        badge.style.backgroundColor = 'var(--color-yellow-light)';
        badge.style.color = 'var(--color-yellow-dark)';
      } else if (text === 'HIGH') {
        badge.style.backgroundColor = 'var(--color-red-light)';
        badge.style.color = 'var(--color-red)';
      }
    });
  }
}
