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
  /** Summary counts for KPI cards (Total, Open, Resolved, Archived) – only when showHeader && !assetId */
  summaryTotal = signal<number>(0);
  summaryOpen = signal<number>(0);
  summaryResolved = signal<number>(0);
  summaryArchived = signal<number>(0);
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
    { label: 'Incidents' },
  ];

  tableFilters = signal<FilterPill[]>([]);

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    searchPlaceholder: 'Search Incidents',
    serverSideSearch: true,
    columns: [
      {
        key: 'asset',
        header: 'Assets',
        cellType: 'two-line',
        primaryField: 'assetName',
        secondaryField: 'assetUrlDisplay',
        linkField: 'assetUrl',
        sortable: true,
        sortByKey: 'assetName',
        width: '260px',
        cellClass: 'incident-asset-cell',
      },
      {
        key: 'incident',
        header: 'Incident',
        cellType: 'text',
        primaryField: 'incidentTitle',
        cellClass: 'fw-bold',
        sortable: true,
        sortByKey: 'incidentTitle',
        width: '300px',
        routerLinkFn: (row: any) => ({ commands: ['/incidents', row?.id] }),
      },
      {
        key: 'severity',
        header: 'Severity',
        cellType: 'badge-with-subtext',
        badgeField: 'severityCode',
        subtextField: 'severityDescription',
        badgeColor: (row: any) => this.getSeverityBadgeColor(row.severity),
        badgeTextColor: (row: any) =>
          this.getSeverityBadgeTextColor(row.severity),
        sortable: true,
        sortByKey: 'severity',
        width: '150px',
      },
      {
        key: 'status',
        header: 'Status',
        cellType: 'badge-with-subtext',
        badgeField: 'status',
        subtextField: 'statusSince',
        badgeColor: (row: any) => this.getStatusBadgeColor(row.status),
        badgeTextColor: (row: any) => this.getStatusBadgeTextColor(row.status),
        sortable: true,
        sortByKey: 'status',
        width: '180px',
      },
      {
        key: 'createdBy',
        header: 'Created By',
        cellType: 'two-line',
        primaryField: 'createdBy',
        secondaryField: 'createdAgo',
        sortable: false,
        width: '180px',
      },
      {
        key: 'checkIncident',
        header: 'Check Incident',
        cellType: 'actions',
        sortable: false,
        width: '180px',
        actionLinks: [
          {
            label: 'Check Current Status',
            display: 'text',
            color: 'var(--color-primary, #008080)',
          },
        ],
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
            // Trigger load with applied filters so the table shows filtered data (e.g. Status=Open from watchlist link)
            this.loadIncidents(this.buildSearchParamsFromFilters());
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
        // Default to "Open" filter on main incidents page when no status in URL
        if (this.showHeader && !this.assetId && responses.statuses?.isSuccessful) {
          this.tableFilters.update((filters) => {
            const statusFilter = filters.find((f) => f.id === 'status');
            if (!statusFilter || (statusFilter.value ?? '') !== '') return filters;
            const openOpt = statusFilter.options?.find(
              (o) => String(o.label || '').toLowerCase() === 'open',
            );
            if (!openOpt?.value) return filters;
            return filters.map((f) =>
              f.id === 'status'
                ? { ...f, value: openOpt.value, label: `Status: ${openOpt.label}` }
                : f,
            );
          });
          // Trigger first load with Open filter so table shows filtered data (table may emit later with same params)
          this.loadIncidents(this.buildSearchParamsFromFilters());
        }
        this.filtersReady.set(true);
        // Load header summary for KPI cards from /Incident/header once on init.
        if (this.showHeader && !this.assetId) {
          this.loadHeaderSummary();
        }
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

  /**
   * Load incidents header summary from /Incident/header for the 4 KPI cards.
   * Cards always come from this API (list below still uses /Incident).
   */
  private loadHeaderSummary(): void {
    this.apiService.getIncidentHeader().subscribe({
      next: (response: ApiResponse) => {
        if (response.isSuccessful && response.data?.summary) {
          const s = response.data.summary as {
            totalIncidents?: number;
            openIncidents?: number;
            closedIncidents?: number;
            archivedIncidents?: number;
          };
          const total = Number(s.totalIncidents) || 0;
          const open = Number(s.openIncidents) || 0;
          const closed = Number(s.closedIncidents) || 0;
          const archived = Number(s.archivedIncidents) || 0;
          // Total card = non-archived incidents
          this.summaryTotal.set(total - archived);
          this.summaryOpen.set(open);
          // Resolved card = closed but not archived
          this.summaryResolved.set(closed - archived);
          this.summaryArchived.set(archived);
        }
      },
      error: () => {
        // Keep existing values (0 by default); no toast needed for header failure.
      },
    });
  }

  /** Load summary counts for the 4 KPI cards (Total, Open, Resolved, Archived) via 4 separate calls. */
  private loadSummaryCounts(statuses: { id?: number; name?: string }[]): void {
    const getStatusId = (name: string) => {
      const s = statuses.find(
        (x) => String(x.name || '').toLowerCase() === name.toLowerCase(),
      );
      return s?.id != null ? String(s.id) : null;
    };
    const openId = getStatusId('Open');
    const resolvedId = getStatusId('Resolved');
    const archivedId = getStatusId('Archived');

    const baseParams = new HttpParams().set('pageNumber', '1').set('pageSize', '1');
    const total$ = this.apiService.getIncidents(baseParams);
    const open$ = openId ? this.apiService.getIncidents(baseParams.set('StatusId', openId)) : null;
    const resolved$ = resolvedId ? this.apiService.getIncidents(baseParams.set('StatusId', resolvedId)) : null;
    const archived$ = archivedId ? this.apiService.getIncidents(baseParams.set('StatusId', archivedId)) : null;

    const requests = [total$, open$, resolved$, archived$].filter(Boolean) as ReturnType<ApiService['getIncidents']>[];
    forkJoin(requests).subscribe({
      next: (responses) => {
        const getTotal = (r: ApiResponse) => (r as any)?.data?.totalCount ?? 0;
        let idx = 0;
        this.summaryTotal.set(getTotal(responses[idx++]));
        this.summaryOpen.set(open$ ? getTotal(responses[idx++]) : 0);
        this.summaryResolved.set(resolved$ ? getTotal(responses[idx++]) : 0);
        this.summaryArchived.set(archived$ ? getTotal(responses[idx++]) : 0);
      },
      error: () => {
        this.summaryTotal.set(this.totalItems());
        this.summaryOpen.set(0);
        this.summaryResolved.set(0);
        this.summaryArchived.set(0);
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

  /** Apply status filter when user clicks Open / Resolved / Archived tile. Total tile does nothing. */
  onSummaryTileClick(status: 'open' | 'resolved' | 'archived'): void {
    const statusLabel = status === 'open' ? 'Open' : status === 'resolved' ? 'Resolved' : 'Archived';
    const filters = this.tableFilters();
    const statusFilter = filters.find((f) => f.id === 'status');
    if (!statusFilter?.options?.length) return;
    const opt = statusFilter.options.find(
      (o) => String(o.label || '').toLowerCase() === statusLabel.toLowerCase(),
    );
    if (!opt?.value) return;

    this.tableFilters.update((prev) =>
      prev.map((f) => {
        if (f.id !== 'status') return f;
        return {
          ...f,
          value: opt.value,
          label: `Status: ${opt.label}`,
        };
      }),
    );

    const params = this.buildSearchParamsFromFilters();
    this.loadIncidents(params);
  }

  /** Build HttpParams from current table filters (page 1, default size) for tile-click or programmatic filter. Uses same param names as reusable-table (PageNumber, PageSize). */
  private buildSearchParamsFromFilters(): HttpParams {
    const config = this.tableConfig();
    const pageSize = (config as any).defaultPageSize ?? 10;
    let params = new HttpParams()
      .set('PageNumber', '1')
      .set('PageSize', String(pageSize));

    if (this.hasMinistryIdFromRoute) {
      const mid =
        this.activatedRoute.snapshot.queryParams['MinistryId'] ??
        this.activatedRoute.snapshot.queryParams['ministryId'];
      if (mid) params = params.set('MinistryId', mid);
    }

    this.tableFilters().forEach((filter) => {
      if (filter.paramKey && filter.value != null && filter.value !== '' && filter.value !== 'All') {
        params = params.set(filter.paramKey, filter.value);
      }
    });
    return params;
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
          // Update summary cards only when request has no status filter, so Total stays global (not overwritten by filtered response)
          const hasStatusFilter = apiParams.has('StatusId') && (apiParams.get('StatusId') ?? '') !== '';
          if (
            this.showHeader &&
            !this.assetId &&
            response.data?.summary &&
            !hasStatusFilter
          ) {
            const s = response.data.summary as {
              totalIncidents?: number;
              openIncidents?: number;
              closedIncidents?: number;
              archivedIncidents?: number;
            };
            this.summaryTotal.set(Number(s.totalIncidents) || 0);
            this.summaryOpen.set(Number(s.openIncidents) || 0);
            this.summaryResolved.set((Number(s.closedIncidents) || 0) - (Number(s.archivedIncidents) || 0));
            this.summaryArchived.set(Number(s.archivedIncidents) || 0);
          }
          // Process and format the incidents data
          const processedIncidents = data.map((incident: any) => ({
            ...incident,
            status: incident.status || 'Open',
            statusSince: incident.statusSince
              ? `Since: ${String(incident.statusSince).toLowerCase()}`
              : `Since: ${this.formatTimeAgo(incident.createdAt)}`,
            createdAgo: incident.createdAgo
              ? `Created: ${String(incident.createdAgo).toLowerCase()}`
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
            assetRouterLink: incident.assetUrl,
            assetUrlDisplay: incident.assetUrl || '—',
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
              ? `Since: ${String(incident.statusSince).toLowerCase()}`
              : `Since: ${this.formatTimeAgo(incident.createdAt)}`,
            createdAgo: incident.createdAgo
              ? `Created: ${String(incident.createdAgo).toLowerCase()}`
              : `Created: ${this.formatTimeAgo(incident.createdAt)}`,
            severityCode: this.formatSeverityCode(incident.severity),
            severityDescription:
              incident.severityDescription || incident.severity || 'N/A',
            assetName: incident.assetName || `Asset ${incident.assetId}`,
            ministryName: incident.ministryName || 'N/A',
            kpiDescription:
              incident.kpiDescription || incident.description || 'N/A',
            assetRouterLink: incident.assetUrl,
            assetUrlDisplay: incident.assetUrl || '—',
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
    // P1 dark red, P2 mustard yellow, P3 medium blue, P4 dark green
    if (
      level === 'P1' ||
      level === '1' ||
      level === 'P1 CRITICAL' ||
      level === 'CRITICAL'
    ) {
      return 'var(--severity-critical-bg)';
    } else if (
      level === 'P2' ||
      level === '2' ||
      level === 'P2 HIGH' ||
      level === 'HIGH'
    ) {
      return 'var(--severity-high-bg)';
    } else if (
      level === 'P3' ||
      level === '3' ||
      level === 'P3 MEDIUM' ||
      level === 'MEDIUM' ||
      level === 'MODERATE'
    ) {
      return 'var(--severity-medium-bg)';
    } else if (
      level === 'P4' ||
      level === '4' ||
      level === 'P4 LOW' ||
      level === 'LOW' ||
      level === 'INFO'
    ) {
      return 'var(--severity-low-bg)';
    }
    return '#F3F4F6';
  }

  getSeverityBadgeTextColor(severity: string): string {
    if (!severity) return '#6B7280';
    const level = severity.toString().toUpperCase();
    // White text on all severity badges for contrast
    if (
      level === 'P1' ||
      level === '1' ||
      level === 'P1 CRITICAL' ||
      level === 'CRITICAL' ||
      level === 'P2' ||
      level === '2' ||
      level === 'P2 HIGH' ||
      level === 'HIGH' ||
      level === 'P3' ||
      level === '3' ||
      level === 'P3 MEDIUM' ||
      level === 'MEDIUM' ||
      level === 'MODERATE' ||
      level === 'P4' ||
      level === '4' ||
      level === 'P4 LOW' ||
      level === 'LOW' ||
      level === 'INFO'
    ) {
      return '#ffffff';
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
      return '#2CCC004A'; // Resolved green background
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
      return '#fff'; // White text on green background
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
        return 'just now';
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

  onCheckIncident(event: { row: any; columnKey: string }): void {
    if (event?.columnKey !== 'Check Current Status') return;
    const row = event?.row as ActiveIncident;
    if (row?.assetId == null || row?.kpiId == null) {
      this.utils.showToast(null, 'Asset or KPI information is missing.', 'error');
      return;
    }
    this.apiService.manualCheckFromAsset(row.assetId, row.kpiId).subscribe({
      next: (res) => {
        if (res?.isSuccessful) {
          this.utils.showToast(null, res?.message ?? 'Current status check triggered successfully.', 'success');
          this.onRefresh();
        } else {
          this.utils.showToast(null, res?.message ?? 'Check failed.', 'error');
        }
      },
      error: (err) => {
        this.utils.showToast(err, 'Failed to check current status.');
      },
    });
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

}
