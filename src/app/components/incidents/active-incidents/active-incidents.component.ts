import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
} from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { ApiResponse, ApiService } from '../../../services/api.service';
import { BreadcrumbItem } from '../../reusable/reusable-breadcrum/reusable-breadcrum.component';
import { HttpParams } from '@angular/common/http';
import { UtilsService } from '../../../services/utils.service';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import {
  TableConfig,
  FilterPill,
} from '../../reusable/reusable-table/reusable-table.component';
import { ManageIncidentsComponent } from '../manage-incidents/manage-incidents.component';

export interface ActiveIncident {
  id: number;
  assetId: number;
  kpiId: number;
  incidentTitle: string;
  description: string;
  securityLevel: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  // Additional fields from backend response
  severity?: string;
  severityCode?: string;
  severityDescription?: string;
  status?: string;
  statusSince?: string;
  createdAgo?: string;
  kpiDescription?: string;
  assetName?: string;
  assetUrl: string;
  ministryName?: string;
}

@Component({
  selector: 'app-active-incidents',
  templateUrl: './active-incidents.component.html',
  styleUrl: './active-incidents.component.scss',
  standalone: false,
})
export class ActiveIncidentsComponent implements OnInit {
  @Input() showHeader: boolean = true;
  @Input() showBreadcrumb: boolean = true;
  @Input() showAddButton: boolean = true;
  @Input() assetId: number | null = null; // When set, load incidents for this asset only via getIncidentByAssetId
  @Input() initialQueryParams: Params | null = null; // When in view-assets-detail, pass route queryParams so filters and URL stay in sync
  @Output() queryParamsChange = new EventEmitter<Params>(); // Emit when incident filters change so parent can update URL

  incidents = signal<ActiveIncident[]>([]);
  totalItems = signal<number>(0);
  private incidentsByAssetLoading = false;
  /** When true, table can render (filters applied from route if any). Avoids double API call when opening with ?MinistryId=... */
  filtersReady = signal(false);
  hasRouteQueryParams = false;
  /** When true, came from ministry detail (MinistryId in URL) – hide ministry filter pill but still send MinistryId to API */
  hasMinistryIdFromRoute = false;
  /** Filters to show in table – hide ministry & asset only when in view-assets-detail (assetId). From ministry detail we show ministry filter so user sees selected ministry. */
  displayFilters = computed(() => {
    const f = this.tableFilters();
    if (this.assetId) {
      return f.filter((x) => x.id !== 'ministry' && x.id !== 'asset');
    }
    return f;
  });

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Incidents' },
  ];

  tableFilters = signal<FilterPill[]>([]);

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    searchPlaceholder: 'Search incidents',
    serverSideSearch: true,
    columns: [
      {
        key: 'viewDetails',
        header: 'VIEW DETAILS',
        cellType: 'icon',
        iconUrl: '/assets/info-icon.svg',
        iconColor: 'var(--color-primary)',
        iconBgColor: 'var(--color-primary-light)',
        sortable: false,
        width: '100px',
      },
      {
        key: 'incident',
        header: 'INCIDENT',
        cellType: 'text',
        primaryField: 'incidentTitle',
        cellClass: 'fw-bold',
        sortable: false,
        width: '300px',
      },
      {
        key: 'severity',
        header: 'SEVERITY',
        cellType: 'badge-with-subtext',
        badgeField: 'severityCode',
        subtextField: 'severityDescription',
        badgeColor: (row: any) => this.getSeverityBadgeColor(row.severity),
        badgeTextColor: (row: any) =>
          this.getSeverityBadgeTextColor(row.severity),
        sortable: false,
        width: '150px',
      },
      {
        key: 'status',
        header: 'STATUS',
        cellType: 'badge-with-subtext',
        badgeField: 'status',
        subtextField: 'statusSince',
        badgeColor: (row: any) => this.getStatusBadgeColor(row.status),
        badgeTextColor: (row: any) => this.getStatusBadgeTextColor(row.status),
        sortable: false,
        width: '180px',
      },
      {
        key: 'createdBy',
        header: 'CREATED BY',
        cellType: 'two-line',
        primaryField: 'createdBy',
        secondaryField: 'createdAgo',
        sortable: false,
        width: '180px',
      },
      {
        key: 'kpi',
        header: 'KPI',
        cellType: 'text',
        primaryField: 'kpi',
        sortable: false,
        width: '250px',
        cellClass: 'fw-bold',
      },
      {
        key: 'asset',
        header: 'ASSET',
        cellType: 'two-line',
        primaryField: 'ministryName',
        secondaryField: 'assetName',
        linkField: 'assetRouterLink',
        sortable: false,
        width: '200px',
      },
    ],
    data: [],
    emptyStateMessage: 'No incidents available at this time.',
  });

  tableConfigWithData = computed(() => {
    return {
      ...this.tableConfig(),
      data: this.incidents(),
    };
  });

  constructor(
    private apiService: ApiService,
    private utils: UtilsService,
    private dialog: MatDialog,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const qp = this.activatedRoute.snapshot.queryParams;
    this.hasRouteQueryParams =
      !this.assetId && qp != null && Object.keys(qp).length > 0;
    this.hasMinistryIdFromRoute =
      !this.assetId && !!(qp?.['MinistryId'] ?? qp?.['ministryId']);
    this.initializeFilters();
  }

  private applyQueryParamsToFilters(params: Params): void {
    const getParam = (key: string) =>
      params[key] ??
      (key === 'MinistryId' ? params['ministryId'] : undefined) ??
      (key === 'SeverityId' ? params['severityId'] : undefined) ??
      (key === 'StatusId'
        ? params['Status'] ?? params['StatuId'] ?? params['statusId']
        : undefined);
    this.tableFilters.update((filters) =>
      filters.map((f) => {
        const key = f.paramKey;
        if (!key) return f;
        const paramValue = getParam(key);
        if (paramValue == null || paramValue === '') return f;
        // Match by value (e.g. ID) first, then by label (e.g. "Open") so URL can use name and API gets ID
        let opt = f.options?.find((o) => o.value === paramValue);
        if (!opt) {
          opt = f.options?.find(
            (o) => o.label?.toLowerCase() === String(paramValue).toLowerCase(),
          );
        }
        if (!opt) return f;
        const value = opt.value;
        const label = opt.label;
        return {
          ...f,
          value,
          label: `${f.id === 'ministry' ? 'Ministry' : f.id === 'status' ? 'Status' : f.id === 'severity' ? 'Severity' : f.id === 'createdBy' ? 'Created by' : f.id === 'assignedTo' ? 'Assigned to' : f.id === 'kpi' ? 'KPI' : 'Assets'}: ${label}`,
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
        // /api/Incident expects MinistryId
        paramKey: 'MinistryId',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'status',
        label: 'Status: All',
        value: '',
        removable: true,
        // /api/Incident expects StatusId
        paramKey: 'StatusId',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'severity',
        label: 'Severity: All',
        value: '',
        removable: true,
        // /api/Incident expects SeverityId
        paramKey: 'SeverityId',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'createdBy',
        label: 'Created by: All',
        value: '',
        removable: true,
        // /api/Incident expects CreatedBy
        paramKey: 'CreatedBy',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'assignedTo',
        label: 'Assigned to: All',
        value: '',
        removable: true,
        // /api/Incident expects AssignedTo
        paramKey: 'AssignedTo',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'kpi',
        label: 'KPI: All',
        value: '',
        removable: true,
        // /api/Incident expects KpiId
        paramKey: 'KpiId',
        options: [{ label: 'All', value: '' }],
      },
      {
        id: 'asset',
        label: 'Assets: All',
        value: '',
        removable: true,
        // /api/Incident expects AssetId
        paramKey: 'AssetId',
        options: [{ label: 'All', value: '' }],
      },
    ]);

    // Load filter options from APIs
    this.loadFilterOptions();
  }

  loadFilterOptions(): void {
    forkJoin({
      ministries: this.apiService.getAllMinistries(),
      severityLevels: this.apiService.getLovByType('SeverityLevel'),
      statuses: this.apiService.getLovByType('Status'),
      kpis: this.apiService.getAllKpis(),
      assets: this.apiService.getAllAssets(),
      users: this.apiService.getAllUsers(),
    }).subscribe({
      next: (responses) => {
        // Update Ministry filter
        if (responses.ministries.isSuccessful) {
          const ministryOptions = [{ label: 'All', value: '' }];
          const ministries = Array.isArray(responses.ministries.data)
            ? responses.ministries.data
            : [];
          ministries.forEach((ministry: any) => {
            ministryOptions.push({
              label: ministry.ministryName,
              value: ministry.id?.toString(),
            });
          });
          this.updateFilterOptions('ministry', ministryOptions);
        }

        // Update Severity filter
        if (responses.severityLevels.isSuccessful) {
          const severityOptions = [{ label: 'All', value: '' }];
          const severities = Array.isArray(responses.severityLevels.data)
            ? responses.severityLevels.data
            : [];
          severities.forEach((severity: any) => {
            severityOptions.push({
              label: severity.name,
              value: severity.id?.toString(),
            });
          });
          this.updateFilterOptions('severity', severityOptions);
        }

        // Update Status filter (static options)
        if (responses.statuses.isSuccessful) {
          const statusOptions = [{ label: 'All', value: '' }];
          const statuses = Array.isArray(responses.statuses.data)
            ? responses.statuses.data
            : [];
          statuses.forEach((status: any) => {
            statusOptions.push({
              label: status.name,
              value: status.id?.toString(),
            });
          });
          this.updateFilterOptions('status', statusOptions);
        }

        // Update KPI filter
        if (responses.kpis.isSuccessful) {
          const kpiOptions = [{ label: 'All', value: '' }];
          const kpis = Array.isArray(responses.kpis.data)
            ? responses.kpis.data
            : [];
          kpis.forEach((kpi: any) => {
            kpiOptions.push({
              label: kpi.name,
              value: kpi.id?.toString(),
            });
          });
          this.updateFilterOptions('kpi', kpiOptions);
        }

        // Update Assets filter
        if (responses.assets.isSuccessful) {
          const assetOptions = [{ label: 'All', value: '' }];
          const assets = Array.isArray(responses.assets.data)
            ? responses.assets.data
            : [];
          assets.forEach((asset: any) => {
            assetOptions.push({
              label: asset.name,
              value: asset.id?.toString(),
            });
          });
          this.updateFilterOptions('asset', assetOptions);
        }

        // Update Created By and Assigned To filters (users)
        if (responses.users.isSuccessful) {
          const userOptions = [{ label: 'All', value: '' }];
          const users = Array.isArray(responses.users.data)
            ? responses.users.data
            : [];
          users.forEach((user: any) => {
            userOptions.push({
              label: user.email,
              value: user.email,
            });
          });
          this.updateFilterOptions('createdBy', userOptions);
          this.updateFilterOptions('assignedTo', userOptions);
        }
        // When on view-assets-detail (assetId), do not apply id/ministryId from URL to incident filters – only incident filters (Status, SeverityId, etc.)
        if (
          this.assetId &&
          this.initialQueryParams &&
          Object.keys(this.initialQueryParams).length > 0
        ) {
          const paramsForFilters = { ...this.initialQueryParams };
          delete paramsForFilters['id'];
          delete paramsForFilters['ministryId'];
          delete paramsForFilters['MinistryId'];
          if (Object.keys(paramsForFilters).length > 0) {
            this.applyQueryParamsToFilters(paramsForFilters);
          }
        }
        // When opened from ministry detail (/incidents?MinistryId=...), apply route query params to filters
        if (
          !this.assetId &&
          this.activatedRoute.snapshot.queryParams &&
          Object.keys(this.activatedRoute.snapshot.queryParams).length > 0
        ) {
          this.applyQueryParamsToFilters(
            this.activatedRoute.snapshot.queryParams,
          );
        }
        this.filtersReady.set(true);
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error loading filter options', 'error');
        // Set default options for all filters on error
        const defaultOptions = [{ label: 'All', value: '' }];
        [
          'ministry',
          'status',
          'severity',
          'createdBy',
          'assignedTo',
          'kpi',
          'asset',
        ].forEach((filterId) => {
          this.updateFilterOptions(filterId, defaultOptions);
        });
        this.filtersReady.set(true);
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
          return { ...filter, options };
        }
        return filter;
      });
    });
  }

  loadIncidents(searchQuery: HttpParams): void {
    if (this.assetId) {
      // By default do not send MinistryId when loading by assetId (API is asset-based)
      const paramsWithoutMinistry = new HttpParams();
      let filteredParams = paramsWithoutMinistry;
      searchQuery.keys().forEach((key) => {
        if (
          key === 'MinistryId' ||
          key === 'ministryId' ||
          key === 'AssetId' ||
          key === 'assetId'
        )
          return;
        (searchQuery.getAll(key) ?? []).forEach((value) => {
          if (value != null) filteredParams = filteredParams.append(key, value);
        });
      });
      this.loadIncidentsByAssetId(filteredParams);
      // Emit full filter state (including empty) so URL can remove params when filter is "All"
      const params: Params = {};
      this.tableFilters().forEach((f) => {
        if (f.paramKey) params[f.paramKey] = f.value ?? '';
      });
      searchQuery.keys().forEach((k) => {
        params[k] = searchQuery.get(k) ?? '';
      });
      this.queryParamsChange.emit(params);
      return;
    }
    // When came from ministry detail: add MinistryId from route only if user hasn't removed the ministry filter
    let apiParams = searchQuery;
    if (this.hasMinistryIdFromRoute) {
      const mid =
        this.activatedRoute.snapshot.queryParams['MinistryId'] ??
        this.activatedRoute.snapshot.queryParams['ministryId'];
      const ministryInQuery =
        searchQuery.get('MinistryId') ?? searchQuery.get('ministryId');
      const ministryRemoved =
        ministryInQuery === '' ||
        ministryInQuery === null ||
        ministryInQuery === undefined;
      if (ministryRemoved) {
        // User removed ministry filter (All) – build API params without MinistryId
        let params = new HttpParams();
        searchQuery.keys().forEach((k) => {
          if (k === 'MinistryId' || k === 'ministryId') return;
          (searchQuery.getAll(k) ?? []).forEach((v) => {
            if (v != null && v !== '') params = params.append(k, v);
          });
        });
        apiParams = params;
      } else if (mid) {
        let merged = new HttpParams().set('MinistryId', mid);
        searchQuery.keys().forEach((k) => {
          if (k === 'MinistryId' || k === 'ministryId') return;
          (searchQuery.getAll(k) ?? []).forEach((v) => {
            if (v != null) merged = merged.append(k, v);
          });
        });
        apiParams = merged;
      }
    }
    this.apiService.getIncidents(apiParams).subscribe({
      next: (response: ApiResponse) => {
        if (response.isSuccessful) {
          const data: ActiveIncident[] = response.data.data;
          const totalCount = response.data.totalCount || 0;
          // Process and format the incidents data
          const processedIncidents = data.map((incident: any) => ({
            ...incident,
            status: incident.status || 'Open',
            statusSince: incident.statusSince
              ? `Since: ${incident.statusSince}`
              : `Since: ${this.formatTimeAgo(incident.createdAt)}`,
            createdAgo: incident.createdAgo
              ? `Created: ${incident.createdAgo}`
              : `Created: ${this.formatTimeAgo(incident.createdAt)}`,
            // Format severity code (P1, P2, P3, P4) from severity value
            severityCode: this.formatSeverityCode(incident.severity),
            severityDescription:
              incident.severityDescription || incident.severity || 'N/A',
            // Use fields directly from backend response
            assetName: incident.assetName || `Asset ${incident.assetId}`,
            ministryName: incident.ministryName || 'N/A',
            kpiDescription:
              incident.kpiDescription || incident.description || 'N/A',
            // Use full URL from backend if available, otherwise use router link
            assetRouterLink: incident.assetUrl,
          }));
          this.incidents.set(processedIncidents);
          this.totalItems.set(totalCount);
        } else {
          this.utils.showToast(
            response.message,
            'Error loading incidents',
            'error',
          );
          this.incidents.set([]);
          this.totalItems.set(0);
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error loading incidents', 'error');
        this.incidents.set([]);
        this.totalItems.set(0);
      },
    });
  }

  loadIncidentsByAssetId(searchQuery?: HttpParams): void {
    if (!this.assetId) return;
    if (this.incidentsByAssetLoading) return; // Prevent duplicate API calls
    this.incidentsByAssetLoading = true;
    this.apiService.getIncidentByAssetId(this.assetId, searchQuery).subscribe({
      next: (response: ApiResponse<any>) => {
        this.incidentsByAssetLoading = false;
        if (response.isSuccessful && response.data != null) {
          const raw = response.data;
          const data: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
          const totalCount = Array.isArray(raw)
            ? data.length
            : (raw?.totalCount ?? data.length);
          const processedIncidents = data.map((incident: any) => ({
            ...incident,
            status: incident.status || 'Open',
            statusSince: incident.statusSince
              ? `Since: ${incident.statusSince}`
              : `Since: ${this.formatTimeAgo(incident.createdAt)}`,
            createdAgo: incident.createdAgo
              ? `Created: ${incident.createdAgo}`
              : `Created: ${this.formatTimeAgo(incident.createdAt)}`,
            severityCode: this.formatSeverityCode(incident.severity),
            severityDescription:
              incident.severityDescription || incident.severity || 'N/A',
            assetName: incident.assetName || `Asset ${incident.assetId}`,
            ministryName: incident.ministryName || 'N/A',
            kpiDescription:
              incident.kpiDescription || incident.description || 'N/A',
            assetRouterLink: incident.assetUrl,
          }));
          this.incidents.set(processedIncidents);
          this.totalItems.set(totalCount);
        } else {
          this.incidents.set([]);
          this.totalItems.set(0);
        }
      },
      error: (error: any) => {
        this.incidentsByAssetLoading = false;
        this.utils.showToast(
          error,
          'Error loading incidents for asset',
          'error',
        );
        this.incidents.set([]);
        this.totalItems.set(0);
      },
    });
  }

  formatSeverityCode(severity: string | undefined): string {
    if (!severity) return 'N/A';
    // If already in P1, P2 format, return as is
    if (severity.toUpperCase().startsWith('P')) {
      return severity.toUpperCase();
    }
    // Convert numeric severity to P format
    const severityNum = parseInt(severity);
    if (!isNaN(severityNum) && severityNum >= 1 && severityNum <= 4) {
      return `P${severityNum}`;
    }
    return severity;
  }

  getSeverityBadgeColor(severity: string): string {
    if (!severity) return '#F3F4F6';
    const level = severity.toString().toUpperCase();
    // Handle P1, P2, P3, P4 format or numeric 1, 2, 3, 4
    if (
      level === 'P1' ||
      level === '1' ||
      level === 'P1 CRITICAL' ||
      level === 'CRITICAL'
    ) {
      return 'var(--color-red-light)';
    } else if (
      level === 'P2' ||
      level === '2' ||
      level === 'P2 HIGH' ||
      level === 'HIGH'
    ) {
      return 'var(--color-orange-light)';
    } else if (
      level === 'P3' ||
      level === '3' ||
      level === 'P3 MEDIUM' ||
      level === 'MEDIUM' ||
      level === 'MODERATE'
    ) {
      return 'var(--color-yellow-light)';
    } else if (
      level === 'P4' ||
      level === '4' ||
      level === 'P4 LOW' ||
      level === 'LOW' ||
      level === 'INFO'
    ) {
      return 'var(--color-green-light)';
    }
    return '#F3F4F6';
  }

  getSeverityBadgeTextColor(severity: string): string {
    if (!severity) return '#6B7280';
    const level = severity.toString().toUpperCase();
    if (
      level === 'P1' ||
      level === '1' ||
      level === 'P1 CRITICAL' ||
      level === 'CRITICAL'
    ) {
      return 'var(--color-red)';
    } else if (
      level === 'P2' ||
      level === '2' ||
      level === 'P2 HIGH' ||
      level === 'HIGH'
    ) {
      return 'var(--color-orange)';
    } else if (
      level === 'P3' ||
      level === '3' ||
      level === 'P3 MEDIUM' ||
      level === 'MEDIUM' ||
      level === 'MODERATE'
    ) {
      return 'var(--color-yellow)';
    } else if (
      level === 'P4' ||
      level === '4' ||
      level === 'P4 LOW' ||
      level === 'LOW' ||
      level === 'INFO'
    ) {
      return 'var(--color-green-dark)';
    }
    return '#6B7280';
  }

  getStatusBadgeColor(status: string): string {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'OPEN') {
      return 'var(--color-light-lightgrey2)'; // Grey background
    } else if (statusUpper === 'INVESTIGATING') {
      return 'var(--color-red-light)'; // Light red/pink background
    } else if (statusUpper === 'FIXING') {
      return 'var(--color-yellow-light)'; // Yellow background
    } else if (statusUpper === 'MONITORING') {
      return 'var(--color-green-light)'; // Light green background
    } else if (statusUpper === 'RESOLVED' || statusUpper === 'CLOSED') {
      return '#B2F5EA'; // Teal/blue-green background
    } else if (statusUpper === 'IN PROGRESS' || statusUpper === 'IN_PROGRESS') {
      return 'var(--color-blue-light)';
    }
    return '#F3F4F6';
  }

  getStatusBadgeTextColor(status: string): string {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'OPEN') {
      return 'var(--color-text-white)';
    } else if (statusUpper === 'INVESTIGATING') {
      return 'var(--color-red)'; // Red text
    } else if (statusUpper === 'FIXING') {
      return 'var(--color-yellow)'; // Yellow text
    } else if (statusUpper === 'MONITORING') {
      return 'var(--color-green-dark)'; // Green text
    } else if (statusUpper === 'RESOLVED' || statusUpper === 'CLOSED') {
      return '#047857'; // Dark teal text
    } else if (statusUpper === 'IN PROGRESS' || statusUpper === 'IN_PROGRESS') {
      return 'var(--color-blue-dark)';
    }
    return '#1F2937';
  }

  formatTimeAgo(dateString: string): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / 60000);
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'min' : 'mins'} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
      } else {
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
      }
    } catch (error) {
      return 'N/A';
    }
  }

  onRefresh(): void {
    this.utils.refreshTableData();
  }

  onAddIncident(): void {
    const dialogRef = this.dialog.open(ManageIncidentsComponent, {
      width: '90%',
      maxWidth: '700px',
      disableClose: true,
      data: {},
      panelClass: 'responsive-modal',
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.onRefresh();
      }
    });
  }

  onViewDetailsClick(event: { row: any; columnKey: string }): void {
    if (event.row && event.row.id) {
      this.router.navigate(['/incidents', event.row.id]);
    }
  }
}
