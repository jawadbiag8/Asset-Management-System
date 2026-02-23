import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import {
  TableConfig,
  TableColumn,
  FilterPill,
} from '../reusable/reusable-table/reusable-table.component';
import { ApiResponse, ApiService } from '../../services/api.service';
import { FilterOptionsService } from '../../services/filter-options.service';
import { HttpParams } from '@angular/common/http';
import {
  DashboardKpiItem,
  KpiCardAction,
} from '../dashboardkpi/dashboardkpi.component';
import { UtilsService } from '../../services/utils.service';
import { DashboardReturnStateService } from '../../services/dashboard-return-state.service';
import { formatDateOrPassThrough } from '../../utils/date-format.util';
import { filter } from 'rxjs/operators';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { SignalRService, TOPICS } from '../../services/signalr.service';
import { Subject, takeUntil } from 'rxjs';

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
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: false,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly summaryTopic = TOPICS.adminDashboardSummary;

  constructor(
    private apiService: ApiService,
    private filterOptions: FilterOptionsService,
    private utils: UtilsService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private dashboardReturnState: DashboardReturnStateService,
    private signalR: SignalRService,
  ) {}

  tableFilters = signal<FilterPill[]>([]);

  tableConfig = signal<TableConfig>({
    minWidth: '1150px',
    searchPlaceholder: 'Search Assets',
    serverSideSearch: true, // Enable server-side search
    defaultPageSize: 10, // Default page size
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

  // Computed signal to keep table config in sync with data
  tableConfigWithData = computed<TableConfig>(() => {
    const processedData = this.digitalAssets().map((asset) => {
      // Map healthStatus to icon
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

      // Format percentage values
      const formatPercentage = (value: number): string => {
        return `${value}%`;
      };

      // Format lastChecked as "1 min ago" / "1 hr ago" (no "Checked" word)
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
            ago =
              diffMinutes === 1 ? '1 min ago' : `${diffMinutes} mins ago`;
          }
          return ago;
        } catch {
          return 'N/A';
        }
      };

      // Format lastOutage: if it's a date string use MM/DD/YYYY, time; else pass through (e.g. "5 mins ago")
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

      // Health: show only % (and icon in template)
      const formatHealthPercentage = (
        _status: string,
        index: number,
      ): string => {
        return formatPercentage(index);
      };

      // Performance: show only %
      const formatPerformancePercentage = (index: number): string => {
        return formatPercentage(index);
      };

      // Compliance: show only %
      const formatCompliancePercentage = (index: number): string => {
        return formatPercentage(index);
      };

      // Risk display: "LOW RISK" -> "LOW", "MEDIUM RISK" -> "MEDIUM", "HIGH RISK" -> "HIGH"
      const formatRiskDisplay = (value: string | null | undefined): string => {
        if (!value) return value ?? '';
        const u = value.toUpperCase();
        if (u === 'LOW RISK' || u.includes('LOW')) return 'LOW';
        if (u === 'MEDIUM RISK' || u.includes('MEDIUM')) return 'MEDIUM';
        if (u === 'HIGH RISK' || u.includes('HIGH')) return 'HIGH';
        return value.toUpperCase();
      };

      // Format high severity text
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
        performancePercentage: formatPerformancePercentage(
          asset.performanceIndex,
        ),
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

  dashboardKpis = signal<{ isVisible: boolean; data: DashboardKpiItem[] }>({
    isVisible: true,
    data: [
      {
        id: 1,
        title: 'Total Digital Assets Monitored',
        subTitle: 'Active Monitoring Across All Departments',
        value: '0',
        subValue: '',
        subValueColor: '',
        subValueText: 'View All ',
        subValueLink: '/ministries',
        scrollToId: 'assets-table',
      },
      {
        id: 2,
        title: 'Assets Online',
        subTitle: 'Assets Currently Operational And Reachable',
        value: '0',
        subValue: '',
        subValueColor: 'success',
        subValueText: 'View Online Assets ',
        subValueLink: '/ministries?status=Online',
        scrollToId: 'assets-table',
        filterOnClick: { paramKey: 'currentStatus', value: 'Up' },
      },
      {
        id: 3,
        title: 'Health Index',
        subTitle: 'Overall Stability And Availability Score',
        value: '0%',
        subValue: '',
        subValueColor: 'success',
        subValueText: 'View Assets With Poor Health ',
        subValueLink: '/ministries?health=critical',
        scrollToId: 'assets-table',
        filterOnClick: { paramKey: 'health', value: 'Poor' },
      },
      {
        id: 4,
        title: 'Performance Index',
        subTitle: 'Overall Speed And Efficiency Score',
        value: '0%',
        subValue: '',
        subValueColor: 'danger',
        subValueText: 'View Assets With Poor Performance ',
        subValueLink: '/ministries?performance=critical',
        scrollToId: 'assets-table',
        filterOnClick: { paramKey: 'performance', value: 'BELOW AVERAGE' },
      },
      {
        id: 5,
        title: 'Compliance Index',
        subTitle: 'Overall Adherence To Compliance Standards',
        value: '0%',
        subValue: '',
        subValueColor: 'danger',
        subValueText: 'View Assets With Poor Compliance ',
        subValueLink: '/ministries?compliance=critical',
        scrollToId: 'assets-table',
        filterOnClick: { paramKey: 'compliance', value: 'LOW' },
      },
      {
        id: 6,
        title: 'High Risk Assets',
        subTitle: 'Assets With Risk Index > 70%',
        value: '0',
        subValue: '',
        subValueColor: 'danger',
        subValueText: 'View Assets With High Risk ',
        subValueLink: '/ministries?riskRating=Red',
        scrollToId: 'assets-table',
        filterOnClick: { paramKey: 'riskIndex', value: 'HIGH RISK' },
      },
      {
        id: 7,
        title: 'Open Incidents',
        subTitle: 'Active Unresolved Incidents',
        value: '0',
        subValue: '',
        subValueColor: '',
        subValueText: 'View Open Incidents ',
        subValueLink: '/incidents?StatusId=8',
      },
      {
        id: 8,
        title: 'Critical Severity Open Incidents',
        subTitle: 'Active Critical Severity Unresolved Incidents',
        value: '0',
        subValue: '',
        subValueColor: 'success',
        subValueText: 'View Open Critical Severity Incidents ',
        subValueLink: '/incidents?SeverityId=4',
      },
    ],
  });

  ngOnInit() {
    this.initializeFilters();
    this.applyInitialQueryParams();
    this.loadDashboardSummary();

    this.signalR.joinTopic(this.summaryTopic).catch(() => {});
    this.signalR.onDataUpdated.pipe(takeUntil(this.destroy$)).subscribe((topic) => {
      if (topic === this.summaryTopic) {
        this.loadDashboardSummary();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.signalR.leaveTopic(this.summaryTopic).catch(() => {});
  }

  /** URL se saare filter query params padhkar table filters par lagao (edit se wapas aane ya direct URL par aane par). */
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
    // Initialize filters with "All" as default
    this.tableFilters.set([
      {
        id: 'ministry',
        label: 'Ministry: All',
        value: '',
        removable: true,
        // Backend expects MinistryId as query parameter
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
        // Backend expects CitizenImpactLevelId as query parameter
        paramKey: 'CitizenImpactLevelId',
        options: [{ label: 'All', value: '' }],
      },
    ]);

    // Load filter options from APIs
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
            this.utils.showToast(
              response.message,
              'Error loading dashboard summary',
              'error',
            );
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
              subTitle: 'Active Monitoring Across All Departments',
              value: summary.totalAssets.toString(),
              subValue: '',
              subValueColor: '',
              subValueText: 'View All ',
              subValueLink: '/ministries',
              scrollToId: 'assets-table',
            },
            {
              id: 2,
              title: 'Assets Online',
              subTitle: 'Assets Currently Operational And Reachable',
              value: summary.assetsOnline.toString(),
              // Use percentage directly from API
              subValue:
                summary.assetsOnlinePercentage > 0
                  ? toPercent(summary.assetsOnlinePercentage)
                  : '',
              subValueColor: 'success',
              subValueText: 'View Online Assets ',
              subValueLink: '/ministries?status=Online',
              scrollToId: 'assets-table',
              filterOnClick: { paramKey: 'currentStatus', value: 'Up' },
            },
            {
              id: 3,
              title: 'Health Index',
              subTitle: 'Overall Stability And Availability Score',
              value: toPercent(summary.healthIndex),
              subValue: summary.healthStatus,
              subValueColor:
                (summary.healthStatus || '').toLowerCase() === 'healthy'
                  ? 'success'
                  : 'danger',
              subValueText: 'View Assets With Poor Health ',
              subValueLink: '/ministries?health=critical',
              scrollToId: 'assets-table',
              filterOnClick: { paramKey: 'health', value: 'Poor' },
            },
            {
              id: 4,
              title: 'Performance Index',
              subTitle: 'Overall Speed And Efficiency Score',
              value: toPercent(summary.performanceIndex),
              subValue: summary.performanceStatus,
              subValueColor:
                (summary.performanceStatus || '').toUpperCase() === 'AVERAGE'
                  ? 'danger'
                  : 'success',
              subValueText: 'View Assets With Poor Performance ',
              subValueLink: '/ministries?performance=critical',
              scrollToId: 'assets-table',
              filterOnClick: {
                paramKey: 'performance',
                value: 'BELOW AVERAGE',
              },
            },
            {
              id: 5,
              title: 'Compliance Index',
              subTitle: 'Overall Adherence To Compliance Standards',
              value: toPercent(summary.complianceIndex),
              subValue: summary.complianceStatus,
              subValueColor:
                (summary.complianceStatus || '').toUpperCase() === 'HIGH'
                  ? 'success'
                  : 'danger',
              subValueText: 'View Assets With Poor Compliance ',
              subValueLink: '/ministries?compliance=critical',
              scrollToId: 'assets-table',
              filterOnClick: { paramKey: 'compliance', value: 'LOW' },
            },
            {
              id: 6,
              title: 'High Risk Assets',
              subTitle: 'Assets With Risk Index > 70%',
              value: summary.highRiskAssets.toString(),
              subValue: summary.highRiskAssetsStatus,
              subValueColor: 'danger',
              subValueText: 'View Assets With High Risk ',
              subValueLink: '/ministries?riskRating=Red',
              scrollToId: 'assets-table',
              filterOnClick: { paramKey: 'riskIndex', value: 'HIGH RISK' },
            },
            {
              id: 7,
              title: 'Open Incidents',
              subTitle: 'Active Unresolved Incidents',
              value: summary.openIncidents.toString(),
              subValue: '',
              subValueColor: '',
              subValueText: 'View Open Incidents ',
              subValueLink: '/incidents?StatusId=8',
            },
            {
              id: 8,
              title: 'Critical Severity Open Incidents',
              subTitle: 'Active Critical Severity Unresolved Incidents',
              value: summary.criticalOpenIncidents.toString(),
              subValue:
                summary.criticalOpenIncidentsPercentage > 0
                  ? toPercent(summary.criticalOpenIncidentsPercentage)
                  : '',
              subValueColor: 'success',
              subValueText: 'View Open Critical Severity Incidents ',
              subValueLink: '/incidents?SeverityId=4',
            },
          ],
        });
      },
      error: (error) => {
        this.resetDashboardKpis();
        this.utils.showToast(error, 'Error loading dashboard summary', 'error');
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

  /** Sync tableFilters from emitted params so removing a filter pill keeps parent in sync and table updates. */
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

  /** Last params emitted by table; used to refresh list after bulk upload. */
  private lastSearchParams: HttpParams = new HttpParams()
    .set('PageNumber', '1')
    .set('PageSize', '10');

  /** Handle table search/filter/page: sync filters from params, load assets, aur URL ke query params bhi sync. */
  onSearchQuery(params: HttpParams): void {
    this.lastSearchParams = params;
    this.syncFiltersFromParams(params);
    this.loadAssets(params);
    this.syncUrlFromFilters();
  }

  /** Current filters se query params object banao (return URL / edit se wapas aane ke liye). */
  private getCurrentQueryParamsForReturn(): Record<string, string> {
    const queryParams: Record<string, string> = {};
    this.tableFilters().forEach((f) => {
      if (f.paramKey && f.value && f.value !== '' && f.value !== 'All') {
        queryParams[f.paramKey] = f.value;
      }
    });
    return queryParams;
  }

  /** URL ke query params ko current filters se sync karo – filter remove hone par URL se bhi remove. */
  private syncUrlFromFilters(): void {
    const queryParams = this.getCurrentQueryParamsForReturn();
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams,
      replaceUrl: true,
    });
  }

  loadAssets(searchParams: HttpParams) {
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

  onGridIconClick() {
    this.dashboardKpis.update((kpis) => ({
      ...kpis,
      isVisible: !kpis.isVisible,
    }));
  }

  onActionClick(event: { row: any; columnKey: string }) {
    if (event.columnKey === 'Edit Asset') {
      this.onEditClick(event.row);
      return;
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

  /** Navigate to incidents page with filters: MinistryId, StatusId=14 (Open), AssetId */
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

  /** Reset all table filters to default (All) so card links show only that card's filter. */
  private resetTableFiltersToDefault(): void {
    this.tableFilters.update((filters) =>
      filters.map((f) => {
        const labelPrefix = f.label.split(':')[0];
        return {
          ...f,
          value: '',
          label: `${labelPrefix}: All`,
          removable: true,
        };
      }),
    );
  }

  /** Handle KPI card action: clear existing filters, apply only this card's filter (if any), load assets, scroll to table. */
  onKpiCardAction(event: KpiCardAction): void {
    if (event.scrollToId) {
      // Pehle se lage filters hatao – sirf is card wala filter lagega (ya koi nahi "View All" par)
      this.resetTableFiltersToDefault();
      if (event.filterOnClick) {
        const { paramKey, value } = event.filterOnClick;
        this.tableFilters.update((filters) =>
          filters.map((f) => {
            if (f.paramKey !== paramKey) return f;
            const option = f.options?.find((o) => o.value === value);
            const label = option
              ? `${f.label.split(':')[0]}: ${option.label}`
              : `${f.label.split(':')[0]}: ${value}`;
            return { ...f, value, label, removable: true };
          }),
        );
      }
      let params = new HttpParams()
        .set('PageNumber', '1')
        .set('PageSize', '10');
      this.tableFilters().forEach((f) => {
        if (f.paramKey && f.value && f.value !== '' && f.value !== 'All') {
          params = params.set(f.paramKey, f.value);
        }
      });
      this.loadAssets(params);
      setTimeout(
        () =>
          document
            .getElementById(event.scrollToId!)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        100,
      );
    }
  }
}
