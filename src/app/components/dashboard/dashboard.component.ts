import { Component, signal, computed, OnInit } from '@angular/core';
import {
  TableConfig,
  TableColumn,
  FilterPill,
} from '../reusable/reusable-table/reusable-table.component';
import { ApiResponse, ApiService } from '../../services/api.service';
import { HttpParams } from '@angular/common/http';
import { DashboardKpiItem } from '../dashboardkpi/dashboardkpi.component';
import { UtilsService } from '../../services/utils.service';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';

export interface DigitalAsset {
  id: number;
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
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: false,
})
export class DashboardComponent implements OnInit {
  constructor(private apiService: ApiService, private utils: UtilsService, private route: Router) { }

  tableFilters = signal<FilterPill[]>([]);

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    searchPlaceholder: 'Search assets',
    serverSideSearch: true, // Enable server-side search
    defaultPageSize: 10, // Default page size
    columns: [
      {
        key: 'analyze',
        header: 'ANALYZE',
        cellType: 'icon',
        iconUrl: '/assets/analyze.svg',
        sortable: false,
        width: '200px',
      },
      {
        key: 'ministryDepartment',
        header: 'MINISTRY / DEPARTMENT',
        cellType: 'two-line',
        primaryField: 'ministryDepartment',
        secondaryField: 'department',
        sortable: true,
        width: '400px',
      },
      {
        key: 'websiteApplication',
        header: 'WEBSITE / APPLICATION',
        cellType: 'two-line',
        primaryField: 'websiteApplication',
        secondaryField: 'assetUrl',
        linkField: 'assetUrl',
        sortable: true,
        width: '200px',
      },
      {
        key: 'currentStatus',
        header: 'CURRENT STATUS',
        cellType: 'badge-with-subtext',
        badgeField: 'currentStatus',
        subtextField: 'lastCheckedFormatted',
        badgeColor: (row: any) => {
          const status = row.currentStatus?.toLowerCase();
          if (status === 'up' || status === 'online') return 'var(--color-green-light)';
          if (status === 'down' || status === 'offline') return 'var(--color-red-light)';
          return 'var(--color-bg-quaternary)';
        },
        badgeTextColor: (row: any) => {
          const status = row.currentStatus?.toLowerCase();
          if (status === 'up' || status === 'online') return 'var(--color-green-dark)';
          if (status === 'down' || status === 'offline') return 'var(--color-red-dark)';
          return 'var(--color-text-tertiary)';
        },
        sortable: true,
        width: '200px',
      },
      {
        key: 'lastOutage',
        header: 'LAST OUTAGE',
        cellType: 'text',
        primaryField: 'lastOutage',
        sortable: true,
        width: '200px',
      },
      {
        key: 'currentHealth',
        header: 'CURRENT HEALTH',
        cellType: 'health-status',
        healthStatusField: 'healthStatus',
        healthIconField: 'healthIcon',
        healthPercentageField: 'healthPercentage',
        sortable: true,
        width: '200px',
      },
      {
        key: 'performanceStatus',
        header: 'PERFORMANCE STATUS',
        cellType: 'text-with-color',
        primaryField: 'performanceStatus',
        secondaryField: 'performancePercentage',
        sortable: true,
        width: '200px',
        textColor: (row: any) => {
          const status = (row.performanceStatus || '').toLowerCase();
          if (status.includes('performing well') || status.includes('well') || status.includes('good')) return 'success';
          if (status.includes('average')) return 'warning';
          if (status.includes('poor')) return 'danger';
          return '';
        },
      },
      {
        key: 'complianceStatus',
        header: 'COMPLIANCE STATUS',
        cellType: 'text-with-color',
        primaryField: 'complianceStatus',
        secondaryField: 'compliancePercentage',
        sortable: true,
        width: '200px',
        textColor: (row: any) => {
          const status = (row.complianceStatus || '').toLowerCase();
          if (status.includes('high compliance') || status.includes('high')) return 'success';
          if (status.includes('medium compliance') || status.includes('medium')) return 'warning';
          if (status.includes('low compliance') || status.includes('low')) return 'danger';
          return '';
        },
      },
      {
        key: 'riskExposureIndex',
        header: 'RISK EXPOSURE INDEX',
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
        width: '200px',
      },
      {
        key: 'citizenImpactLevel',
        header: 'CITIZEN IMPACT LEVEL',
        cellType: 'badge',
        badgeField: 'citizenImpactLevel',
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
        width: '200px',
      },
      {
        key: 'openIncidents',
        header: 'OPEN INCIDENTS',
        cellType: 'two-line',
        primaryField: 'openIncidents',
        secondaryField: 'highSeverityText',
        sortable: true,
        width: '200px',
      },
      {
        key: 'actions',
        header: 'ACTION',
        cellType: 'actions',
        sortable: false,
        width: '120px',
        actionLinks: [
          {
            label: 'Edit Asset',
            display: 'icon',
            iconName: 'edit',
            color: 'var(--color-primary)',
            disabled: (row: any) => !row?.id,
          },
        ],
      },
    ],
    data: [],
  });

  digitalAssets = signal<DigitalAsset[]>([]);

  totalItems = signal<number>(0);

  // Computed signal to keep table config in sync with data
  tableConfigWithData = computed<TableConfig>(() => {
    const processedData = this.digitalAssets().map((asset) => {
      // Map healthStatus to icon
      const getHealthIcon = (status: string): string => {
        const statusLower = status.toLowerCase();
        if (statusLower === 'healthy' || statusLower === 'up') return 'check_circle';
        if (statusLower === 'critical' || statusLower === 'down' || statusLower === 'poor') return 'error';
        if (statusLower === 'average' || statusLower === 'warning') return 'warning';
        return 'help_outline';
      };

      // Format percentage values
      const formatPercentage = (value: number): string => {
        return `${value}%`;
      };

      // Format lastChecked
      const formatLastChecked = (checked: string | null): string => {
        if (!checked) return 'Never checked';
        // If it's already formatted, return as is, otherwise format it
        return checked;
      };

      // Format health percentage
      const formatHealthPercentage = (status: string, index: number): string => {
        return `Health Index: ${formatPercentage(index)}`;
      };

      // Format performance percentage
      const formatPerformancePercentage = (index: number): string => {
        return `Performance Index: ${formatPercentage(index)}`;
      };

      // Format compliance percentage
      const formatCompliancePercentage = (index: number): string => {
        return `Compliance Index: ${formatPercentage(index)}`;
      };

      // Format high severity text
      const formatHighSeverityText = (highSeverity: number): string => {
        if (highSeverity === 0) return 'No high severity incidents';
        return `High severity: ${highSeverity}`;
      };

      return {
        ...asset,
        healthIcon: getHealthIcon(asset.healthStatus),
        healthPercentage: formatHealthPercentage(asset.healthStatus, asset.healthIndex),
        performancePercentage: formatPerformancePercentage(asset.performanceIndex),
        compliancePercentage: formatCompliancePercentage(asset.complianceIndex),
        lastCheckedFormatted: formatLastChecked(asset.lastChecked),
        highSeverityText: formatHighSeverityText(asset.highSeverityIncidents),
      };
    });

    return {
      ...this.tableConfig(),
      data: processedData,
    };
  });

  dashboardKpis = signal<{ isVisible: boolean; data: DashboardKpiItem[] }>({
    isVisible: true,
    data: [
      {
        id: 1,
        title: 'Total Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '0',
        subValue: '',
        subValueColor: '',
        subValueText: 'View All',
        subValueLink: '/assets/by-ministry',
      },
      {
        id: 2,
        title: 'Assets online',
        subTitle: 'Assets currently operational and reachable',
        value: '0',
        subValue: '',
        subValueColor: 'success',
        subValueText: 'View online assets',
        subValueLink: '/assets/by-ministry?status=Online',
      },
      {
        id: 3,
        title: 'Health Index',
        subTitle: 'Overall stability and availability score',
        value: '0%',
        subValue: '',
        subValueColor: 'success',
        subValueText: 'View critical assets',
        subValueLink: '/assets/by-ministry?health=critical',
      },
      {
        id: 4,
        title: 'Performance Index',
        subTitle: 'Overall speed and efficiency score',
        value: '0%',
        subValue: '',
        subValueColor: 'danger',
        subValueText: 'View critical assets',
        subValueLink: '/assets/by-ministry?performance=critical',
      },
      {
        id: 5,
        title: 'Compliance Index',
        subTitle: 'Overall adherence to compliance standards',
        value: '0%',
        subValue: '',
        subValueColor: 'danger',
        subValueText: 'View critical assets',
        subValueLink: '/assets/by-ministry?compliance=critical',
      },
      {
        id: 6,
        title: 'High Risk Assets',
        subTitle: 'Assets with risk index > 80%',
        value: '0',
        subValue: '',
        subValueColor: 'danger',
        subValueText: 'View critical assets',
        subValueLink: '/assets/by-ministry?riskRating=Red',
      },
      {
        id: 7,
        title: 'Open incidents',
        subTitle: 'Active unresolved incidents',
        value: '0',
        subValue: '',
        subValueColor: '',
        subValueText: 'View open incidents',
        subValueLink: '/active-incidents',
      },
      {
        id: 8,
        title: 'Critical severity open incidents',
        subTitle: 'Active critical severity unresolved incidents',
        value: '0',
        subValue: '',
        subValueColor: 'success',
        subValueText: 'View open critical severity incidents',
        subValueLink: '/active-incidents?severity=critical',
      },
    ],
  });

  ngOnInit() {
    this.initializeFilters();
    this.loadDashboardSummary();
  }

  initializeFilters(): void {
    // Initialize filters with "All" as default
    this.tableFilters.set([
      {
        id: 'ministry',
        label: 'Ministry: All',
        value: '',
        removable: true,
        // Backend expects MinistryId as query parameter
        paramKey: 'MinistryId',
        options: [{ label: 'All', value: '' }]
      },
      {
        id: 'status',
        label: 'Status: All',
        value: '',
        removable: true,
        paramKey: 'status',
        options: [{ label: 'All', value: '' }]
      },
      {
        id: 'health',
        label: 'Health: All',
        value: '',
        removable: true,
        paramKey: 'health',
        options: [{ label: 'All', value: '' }]
      },
      {
        id: 'performance',
        label: 'Performance: All',
        value: '',
        removable: true,
        paramKey: 'performance',
        options: [{ label: 'All', value: '' }]
      },
      {
        id: 'compliance',
        label: 'Compliance: All',
        value: '',
        removable: true,
        paramKey: 'compliance',
        options: [{ label: 'All', value: '' }]
      },
      {
        id: 'riskIndex',
        label: 'Risk Index: All',
        value: '',
        removable: true,
        paramKey: 'riskIndex',
        options: [{ label: 'All', value: '' }]
      },
      {
        id: 'citizenImpact',
        label: 'Citizen Impact: All',
        value: '',
        removable: true,
        // Backend expects CitizenImpactLevelId as query parameter
        paramKey: 'CitizenImpactLevelId',
        options: [{ label: 'All', value: '' }]
      }
    ]);

    // Load filter options from APIs
    this.loadFilterOptions();
  }

  loadFilterOptions(): void {
    forkJoin({
      ministries: this.apiService.getAllMinistries(),
      statuses: this.apiService.getLovByType('Status'),
      citizenImpactLevels: this.apiService.getLovByType('citizenImpactLevel')
    }).subscribe({
      next: (responses) => {
        // Update Ministry filter
        if (responses.ministries.isSuccessful) {
          const ministryOptions = [{ label: 'All', value: '' }];
          const ministries = Array.isArray(responses.ministries.data) ? responses.ministries.data : [];
          ministries.forEach((ministry: any) => {
            ministryOptions.push({
              label: ministry.ministryName || ministry.name,
              value: ministry.id?.toString() || ministry.ministryName || ministry.name
            });
          });
          this.updateFilterOptions('ministry', ministryOptions);
        }

        // Update Status filter
        if (responses.statuses.isSuccessful) {
          const statusOptions = [{ label: 'All', value: '' }];
          const statuses = Array.isArray(responses.statuses.data) ? responses.statuses.data : [];
          statuses.forEach((status: any) => {
            statusOptions.push({
              label: status.name,
              value: status.name || status.id?.toString()
            });
          });
          this.updateFilterOptions('status', statusOptions);
        }

        // Update Citizen Impact filter
        if (responses.citizenImpactLevels.isSuccessful) {
          const citizenImpactOptions = [{ label: 'All', value: '' }];
          const citizenImpacts = Array.isArray(responses.citizenImpactLevels.data) ? responses.citizenImpactLevels.data : [];
          citizenImpacts.forEach((impact: any) => {
            citizenImpactOptions.push({
              label: impact.name,
              value: impact.name || impact.id?.toString()
            });
          });
          this.updateFilterOptions('citizenImpact', citizenImpactOptions);
        }

        // Set static options for Health, Performance, Compliance, and Risk Index
        // These can be updated later if backend provides LOV endpoints for them
        this.updateFilterOptions('health', [
          { label: 'All', value: '' },
          { label: 'Healthy', value: 'Healthy' },
          { label: 'Critical', value: 'Critical' },
          { label: 'Unknown', value: 'Unknown' }
        ]);

        this.updateFilterOptions('performance', [
          { label: 'All', value: '' },
          { label: 'Performing Well', value: 'Performing Well' },
          { label: 'Average', value: 'Average' },
          { label: 'Poor', value: 'Poor' }
        ]);

        this.updateFilterOptions('compliance', [
          { label: 'All', value: '' },
          { label: 'High Compliance', value: 'High Compliance' },
          { label: 'Medium Compliance', value: 'Medium Compliance' },
          { label: 'Low Compliance', value: 'Low Compliance' }
        ]);

        this.updateFilterOptions('riskIndex', [
          { label: 'All', value: '' },
          { label: 'LOW RISK', value: 'LOW RISK' },
          { label: 'MEDIUM RISK', value: 'MEDIUM RISK' },
          { label: 'HIGH RISK', value: 'HIGH RISK' },
          { label: 'UNKNOWN', value: 'UNKNOWN' }
        ]);
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error loading filter options', 'error');
        // Set default static options for all filters on error
        this.updateFilterOptions('ministry', [{ label: 'All', value: '' }]);
        this.updateFilterOptions('status', [{ label: 'All', value: '' }]);
        this.updateFilterOptions('health', [
          { label: 'All', value: '' },
          { label: 'Healthy', value: 'Healthy' },
          { label: 'Critical', value: 'Critical' },
          { label: 'Unknown', value: 'Unknown' }
        ]);
        this.updateFilterOptions('performance', [
          { label: 'All', value: '' },
          { label: 'Performing Well', value: 'Performing Well' },
          { label: 'Average', value: 'Average' },
          { label: 'Poor', value: 'Poor' }
        ]);
        this.updateFilterOptions('compliance', [
          { label: 'All', value: '' },
          { label: 'High Compliance', value: 'High Compliance' },
          { label: 'Medium Compliance', value: 'Medium Compliance' },
          { label: 'Low Compliance', value: 'Low Compliance' }
        ]);
        this.updateFilterOptions('riskIndex', [
          { label: 'All', value: '' },
          { label: 'LOW RISK', value: 'LOW RISK' },
          { label: 'MEDIUM RISK', value: 'MEDIUM RISK' },
          { label: 'HIGH RISK', value: 'HIGH RISK' },
          { label: 'UNKNOWN', value: 'UNKNOWN' }
        ]);
        this.updateFilterOptions('citizenImpact', [{ label: 'All', value: '' }]);
      }
    });
  }

  /**
   * Load KPI cards data from /api/AdminDashboard/summary
   * and map to the existing 8 dashboard cards.
   */
  loadDashboardSummary(): void {
    this.apiService.getAdminDashboardSummary().subscribe({
      next: (response: ApiResponse<any>) => {
        if (!response.isSuccessful || !response.data) {
          this.resetDashboardKpis();
          if (response.message) {
            this.utils.showToast(response.message, 'Error loading dashboard summary', 'error');
          }
          return;
        }

        const data = response.data;

        // Map directly from API contract
        const summary = {
          totalAssets: data.totalDigitalAssetsMonitored ?? 0,
          assetsOnline: data.assetsOnline ?? 0,
          assetsOnlinePercentage: data.assetsOnlinePercentage ?? 0,
          healthIndex: data.healthIndex ?? 0,
          healthStatus: data.healthStatus ?? 'Unknown',
          performanceIndex: data.performanceIndex ?? 0,
          performanceStatus: data.performanceStatus ?? 'Unknown',
          complianceIndex: data.complianceIndex ?? 0,
          complianceStatus: data.complianceStatus ?? 'Unknown',
          highRiskAssets: data.highRiskAssets ?? 0,
          highRiskAssetsStatus: data.highRiskAssetsStatus ?? '',
          openIncidents: data.openIncidents ?? 0,
          criticalOpenIncidents: data.criticalSeverityOpenIncidents ?? 0,
          criticalOpenIncidentsPercentage:
            data.criticalSeverityOpenIncidentsPercentage ?? 0,
        };

        const toPercent = (value: number): string =>
          `${(value ?? 0).toString()}%`;

        this.dashboardKpis.set({
          isVisible: true,
          data: [
            {
              id: 1,
              title: 'Total Digital Assets Monitored',
              subTitle: 'Active monitoring across all departments',
              value: summary.totalAssets.toString(),
              subValue: '',
              subValueColor: '',
              subValueText: 'View All',
              subValueLink: '/assets/by-ministry',
            },
            {
              id: 2,
              title: 'Assets online',
              subTitle: 'Assets currently operational and reachable',
              value: summary.assetsOnline.toString(),
              // Use percentage directly from API
              subValue:
                summary.assetsOnlinePercentage > 0
                  ? toPercent(summary.assetsOnlinePercentage)
                  : '',
              subValueColor: 'success',
              subValueText: 'View online assets',
              subValueLink: '/assets/by-ministry?status=Online',
            },
            {
              id: 3,
              title: 'Health Index',
              subTitle: 'Overall stability and availability score',
              value: toPercent(summary.healthIndex),
              subValue: summary.healthStatus,
              subValueColor:
                (summary.healthStatus || '').toLowerCase() === 'healthy'
                  ? 'success'
                  : 'danger',
              subValueText: 'View critical assets',
              subValueLink: '/assets/by-ministry?health=critical',
            },
            {
              id: 4,
              title: 'Performance Index',
              subTitle: 'Overall speed and efficiency score',
              value: toPercent(summary.performanceIndex),
              subValue: summary.performanceStatus,
              subValueColor:
                (summary.performanceStatus || '').toUpperCase() === 'AVERAGE'
                  ? 'danger'
                  : 'success',
              subValueText: 'View critical assets',
              subValueLink: '/assets/by-ministry?performance=critical',
            },
            {
              id: 5,
              title: 'Compliance Index',
              subTitle: 'Overall adherence to compliance standards',
              value: toPercent(summary.complianceIndex),
              subValue: summary.complianceStatus,
              subValueColor:
                (summary.complianceStatus || '').toUpperCase() === 'HIGH'
                  ? 'success'
                  : 'danger',
              subValueText: 'View critical assets',
              subValueLink: '/assets/by-ministry?compliance=critical',
            },
            {
              id: 6,
              title: 'High Risk Assets',
              subTitle: 'Assets with risk index > 80%',
              value: summary.highRiskAssets.toString(),
              subValue: summary.highRiskAssetsStatus,
              subValueColor: 'danger',
              subValueText: 'View critical assets',
              subValueLink: '/assets/by-ministry?riskRating=Red',
            },
            {
              id: 7,
              title: 'Open incidents',
              subTitle: 'Active unresolved incidents',
              value: summary.openIncidents.toString(),
              subValue: '',
              subValueColor: '',
              subValueText: 'View open incidents',
              subValueLink: '/active-incidents',
            },
            {
              id: 8,
              title: 'Critical severity open incidents',
              subTitle: 'Active critical severity unresolved incidents',
              value: summary.criticalOpenIncidents.toString(),
              subValue:
                summary.criticalOpenIncidentsPercentage > 0
                  ? toPercent(summary.criticalOpenIncidentsPercentage)
                  : '',
              subValueColor: 'success',
              subValueText: 'View open critical severity incidents',
              subValueLink: '/active-incidents?severity=critical',
            },
          ],
        });
      },
      error: (error) => {
        this.resetDashboardKpis();
        this.utils.showToast(
          error,
          'Error loading dashboard summary',
          'error',
        );
      },
    });
  }

  private resetDashboardKpis(): void {
    // Keep structure but reset numeric values to 0
    this.dashboardKpis.update((current) => ({
      ...current,
      data: current.data.map((item) => ({
        ...item,
        value: item.id === 3 || item.id === 4 || item.id === 5 ? '0%' : '0',
        subValue: '',
      })),
    }));
  }

  updateFilterOptions(filterId: string, options: { label: string, value: string }[]): void {
    this.tableFilters.update(filters => {
      return filters.map(filter => {
        if (filter.id === filterId) {
          const selectedValue = filter.value;
          const newLabel = selectedValue && selectedValue !== '' && selectedValue !== 'All'
            ? `${filter.label.split(':')[0]}: ${options.find(opt => opt.value === selectedValue)?.label || selectedValue}`
            : `${filter.label.split(':')[0]}: All`;
          return {
            ...filter,
            options,
            label: newLabel
          };
        }
        return filter;
      });
    });
  }

  loadAssets(searchParams: HttpParams) {
    this.apiService.getAssets(searchParams).subscribe({
      next: (response: ApiResponse) => {
        if (response.isSuccessful) {
          this.digitalAssets.set(response.data.data);
          this.totalItems.set(response.data.totalCount);
        } else {
          this.utils.showToast(response.message, 'Error loading assets', 'error');
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


  onGridIconClick() {
    this.dashboardKpis.update((kpis) => ({
      ...kpis,
      isVisible: !kpis.isVisible,
    }));
  }

  onActionClick(event: { row: any, columnKey: string }) {
    if (event.columnKey === 'analyze') {
      this.route.navigate(['/asset-control-panel'], { queryParams: { assetId: event.row.id } });
      return
    }

    if (event.columnKey === 'Edit Asset') {
      this.onEditClick(event.row);
      return;
    }

    console.log('Event:', event);
  }

  onEditClick(row: any): void {
    if (row?.id) {
      this.route.navigate(['/edit-digital-asset'], { queryParams: { assetId: row.id } });
    }
  }

}
