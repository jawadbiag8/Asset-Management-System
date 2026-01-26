import { Component, OnInit, signal, computed } from '@angular/core';
import { ApiResponse, ApiService } from '../../../services/api.service';
import { BreadcrumbItem } from '../../reusable/reusable-breadcrum/reusable-breadcrum.component';
import { HttpParams } from '@angular/common/http';
import { UtilsService } from '../../../services/utils.service';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import {
  TableConfig,
  FilterPill
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
  // Additional fields for display
  status?: string;
  assetName?: string;
  ministry?: string;
  statusSince?: string; // Formatted timestamp like "Since: 2 hours ago"
  createdAgo?: string; // Formatted timestamp like "Created: 5 mins ago"
}

@Component({
  selector: 'app-active-incidents',
  templateUrl: './active-incidents.component.html',
  styleUrl: './active-incidents.component.scss',
  standalone: false,
})

export class ActiveIncidentsComponent implements OnInit {

  incidents = signal<ActiveIncident[]>([]);

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Incidents' }
  ];

  tableFilters = signal<FilterPill[]>([]);

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    searchPlaceholder: 'Search incidents',
    serverSideSearch: true,
    defaultPageSize: 10,
    columns: [
      {
        key: 'viewDetails',
        header: 'VIEW DETAILS',
        cellType: 'icon',
        iconName: 'info',
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
        sortable: true,
        width: '200px',
      },
      {
        key: 'severity',
        header: 'SEVERITY',
        cellType: 'badge',
        badgeField: 'securityLevel',
        badgeColor: (row: any) => this.getSeverityBadgeColor(row.securityLevel),
        badgeTextColor: (row: any) => this.getSeverityBadgeTextColor(row.securityLevel),
        sortable: true,
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
        sortable: true,
        width: '180px',
      },
      {
        key: 'createdBy',
        header: 'CREATED BY',
        cellType: 'two-line',
        primaryField: 'createdBy',
        secondaryField: 'createdAgo',
        sortable: true,
        width: '180px',
      },
      {
        key: 'kpi',
        header: 'KPI',
        cellType: 'text',
        primaryField: 'description',
        sortable: true,
        width: '250px',
      },
      {
        key: 'asset',
        header: 'ASSET',
        cellType: 'two-line',
        primaryField: 'assetName',
        secondaryField: 'ministry',
        sortable: true,
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
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.initializeFilters();
  }

  initializeFilters(): void {
    // Initialize filters with "All" as default
    this.tableFilters.set([
      {
        id: 'ministry',
        label: 'Ministry: All',
        value: '',
        removable: true,
        paramKey: 'ministry',
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
        id: 'severity',
        label: 'Severity: All',
        value: '',
        removable: true,
        paramKey: 'severity',
        options: [{ label: 'All', value: '' }]
      },
      {
        id: 'createdBy',
        label: 'Created by: All',
        value: '',
        removable: true,
        paramKey: 'createdBy',
        options: [{ label: 'All', value: '' }]
      },
      {
        id: 'assignedTo',
        label: 'Assigned to: All',
        value: '',
        removable: true,
        paramKey: 'assignedTo',
        options: [{ label: 'All', value: '' }]
      },
      {
        id: 'kpi',
        label: 'KPI: All',
        value: '',
        removable: true,
        paramKey: 'kpi',
        options: [{ label: 'All', value: '' }]
      },
      {
        id: 'asset',
        label: 'Assets: All',
        value: '',
        removable: true,
        paramKey: 'asset',
        options: [{ label: 'All', value: '' }]
      }
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
      users: this.apiService.getAllUsers()
    }).subscribe({
      next: (responses) => {
        // Update Ministry filter
        if (responses.ministries.isSuccessful) {
          const ministryOptions = [{ label: 'All', value: '' }];
          const ministries = Array.isArray(responses.ministries.data) ? responses.ministries.data : [];
          ministries.forEach((ministry: any) => {
            ministryOptions.push({
              label: ministry.ministryName,
              value: ministry.id?.toString()
            });
          });
          this.updateFilterOptions('ministry', ministryOptions);
        }

        // Update Severity filter
        if (responses.severityLevels.isSuccessful) {
          const severityOptions = [{ label: 'All', value: '' }];
          const severities = Array.isArray(responses.severityLevels.data) ? responses.severityLevels.data : [];
          severities.forEach((severity: any) => {
            severityOptions.push({
              label: severity.name,
              value: severity.id?.toString()
            });
          });
          this.updateFilterOptions('severity', severityOptions);
        }

        // Update Status filter (static options)
        if (responses.statuses.isSuccessful) {
          const statusOptions = [{ label: 'All', value: '' }];
          const statuses = Array.isArray(responses.statuses.data) ? responses.statuses.data : [];
          statuses.forEach((status: any) => {
            statusOptions.push({
              label: status.name,
              value: status.id?.toString()
            });
          });
          this.updateFilterOptions('status', statusOptions);
        }

        // Update KPI filter
        if (responses.kpis.isSuccessful) {
          const kpiOptions = [{ label: 'All', value: '' }];
          const kpis = Array.isArray(responses.kpis.data) ? responses.kpis.data : [];
          kpis.forEach((kpi: any) => {
            kpiOptions.push({
              label: kpi.name,
              value: kpi.id?.toString()
            });
          });
          this.updateFilterOptions('kpi', kpiOptions);
        }

        // Update Assets filter
        if (responses.assets.isSuccessful) {
          const assetOptions = [{ label: 'All', value: '' }];
          const assets = Array.isArray(responses.assets.data) ? responses.assets.data : [];
          assets.forEach((asset: any) => {
            assetOptions.push({
              label: asset.name,
              value: asset.id?.toString()
            });
          });
          this.updateFilterOptions('asset', assetOptions);
        }

        // Update Created By and Assigned To filters (users)
        if (responses.users.isSuccessful) {
          const userOptions = [{ label: 'All', value: '' }];
          const users = Array.isArray(responses.users.data) ? responses.users.data : [];
          users.forEach((user: any) => {
            userOptions.push({
              label: user.email,
              value: user.email
            });
          });
          this.updateFilterOptions('createdBy', userOptions);
          this.updateFilterOptions('assignedTo', userOptions);
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error loading filter options', 'error');
        // Set default options for all filters on error
        const defaultOptions = [{ label: 'All', value: '' }];
        ['ministry', 'status', 'severity', 'createdBy', 'assignedTo', 'kpi', 'asset'].forEach(filterId => {
          this.updateFilterOptions(filterId, defaultOptions);
        });
      }
    });
  }

  updateFilterOptions(filterId: string, options: { label: string, value: string }[]): void {
    this.tableFilters.update(filters => {
      return filters.map(filter => {
        if (filter.id === filterId) {
          return { ...filter, options };
        }
        return filter;
      });
    });
  }

  loadIncidents(searchQuery: HttpParams): void {
    this.apiService.getIncidents(searchQuery).subscribe({
      next: (response: ApiResponse) => {
        if (response.isSuccessful) {
          const data: ActiveIncident[] = response.data.data;;
          // Process and format the incidents data
          const processedIncidents = data.map((incident: ActiveIncident) => ({
            ...incident,
            status: incident.status || 'Open',
            statusSince: `Since: ${this.formatTimeAgo(incident.createdAt)}`,
            createdAgo: `Created: ${this.formatTimeAgo(incident.createdAt)}`,
            // If assetName and ministry are not in response, you may need to fetch them separately
            // For now, using placeholder or existing data
            assetName: incident.assetName || `Asset ${incident.assetId}`,
            ministry: incident.ministry || 'N/A'
          }));
          this.incidents.set(processedIncidents);
        } else {
          this.utils.showToast(response.message, 'Error loading incidents', 'error');
          this.incidents.set([]);
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error loading incidents', 'error');
        this.incidents.set([]);
      }
    });
  }

  getSeverityBadgeColor(securityLevel: string): string {
    const level = securityLevel?.toUpperCase();
    // Handle P1, P2, P3, P4 format
    if (level === 'P1' || level === 'P1 CRITICAL' || level === 'CRITICAL') {
      return 'var(--color-red-light)';
    } else if (level === 'P2' || level === 'P2 HIGH' || level === 'HIGH') {
      return 'var(--color-orange-light)';
    } else if (level === 'P3' || level === 'P3 MEDIUM' || level === 'MEDIUM' || level === 'MODERATE') {
      return 'var(--color-yellow-light)';
    } else if (level === 'P4' || level === 'P4 LOW' || level === 'LOW' || level === 'INFO') {
      return 'var(--color-green-light)';
    }
    return '#F3F4F6';
  }

  getSeverityBadgeTextColor(securityLevel: string): string {
    const level = securityLevel?.toUpperCase();
    if (level === 'P1' || level === 'P1 CRITICAL' || level === 'CRITICAL') {
      return 'var(--color-red)';
    } else if (level === 'P2' || level === 'P2 HIGH' || level === 'HIGH') {
      return 'var(--color-orange)';
    } else if (level === 'P3' || level === 'P3 MEDIUM' || level === 'MEDIUM' || level === 'MODERATE') {
      return 'var(--color-yellow)';
    } else if (level === 'P4' || level === 'P4 LOW' || level === 'LOW' || level === 'INFO') {
      return 'var(--color-green-dark)';
    }
    return '#6B7280';
  }

  getStatusBadgeColor(status: string): string {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'OPEN') {
      return '#F3F4F6'; // Grey background
    } else if (statusUpper === 'RESOLVED' || statusUpper === 'CLOSED') {
      return 'var(--color-green-light)';
    } else if (statusUpper === 'IN PROGRESS' || statusUpper === 'IN_PROGRESS') {
      return 'var(--color-blue-light)';
    }
    return '#F3F4F6';
  }

  getStatusBadgeTextColor(status: string): string {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'OPEN') {
      return '#1F2937'; // Dark grey text
    } else if (statusUpper === 'RESOLVED' || statusUpper === 'CLOSED') {
      return 'var(--color-green-dark)';
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
      panelClass: 'responsive-modal'
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.onRefresh();
      }
    });
  }
}
