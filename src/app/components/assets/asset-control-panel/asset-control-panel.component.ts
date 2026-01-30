import { Component, OnInit, signal, computed } from '@angular/core';
import { BreadcrumbItem } from '../../reusable/reusable-breadcrum/reusable-breadcrum.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, ApiResponse } from '../../../services/api.service';
import { UtilsService } from '../../../services/utils.service';
import { TableConfig, TableColumn } from '../../reusable/reusable-table/reusable-table.component';
import { ManageIncidentsComponent } from '../../incidents/manage-incidents/manage-incidents.component';
import { MatDialog } from '@angular/material/dialog';

export interface PreviousPageMetadata {
  assetId: number;
}

export interface AssetControlPanelHeader {
  ministryId: number;
  assetUrl: string;
  assetName: string;
  ministry: string;
  department: string;
  citizenImpactLevel: string;
  currentHealth: string;
  riskExposureIndex: string;
  currentStatus: string;
  lastOutage: string;
  ownerName: string;
  ownerEmail: string;
  ownerContact: string;
  technicalOwnerName: string;
  technicalOwnerEmail: string;
  technicalOwnerContact: string;
}

export interface KPI {
  kpiId: number;
  kpiName: string;
  target: string;
  currentValue: string;
  slaStatus: string;
  lastChecked: string;
  dataSource: string;
}

export interface KPICategory {
  categoryName: string;
  kpis: KPI[];
}

export interface AssetControlPanelData {
  header: AssetControlPanelHeader;
  kpiCategories: KPICategory[];
}


@Component({
  selector: 'app-asset-control-panel',
  templateUrl: './asset-control-panel.component.html',
  styleUrl: './asset-control-panel.component.scss',
  standalone: false,
})
export class AssetControlPanelComponent implements OnInit {

  previousPageMetadata = signal<PreviousPageMetadata>({
    assetId: 0
  });

  assetControlPanelData = signal<AssetControlPanelData | null>(null);

  /** Cache table configs per category so the same reference is passed to reusable-table (fixes action click bindings). */
  private tableConfigCache = new Map<string, TableConfig>();

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    searchPlaceholder: '',
    serverSideSearch: false,
    defaultPage: 1,
    defaultPageSize: 10,
    emptyStateMessage: 'No KPI data available',
    columns: [
      {
        key: 'kpiName',
        header: 'KPI NAME',
        cellType: 'text',
        primaryField: 'kpiName',
        sortable: false,
        width: '200px',
      },
      {
        key: 'target',
        header: 'TARGET',
        cellType: 'text',
        primaryField: 'target',
        sortable: false,
        width: '150px',
      },
      {
        key: 'currentValue',
        header: 'CURRENT VALUE',
        cellType: 'text',
        primaryField: 'currentValue',
        sortable: false,
        width: '150px',
      },
      {
        key: 'slaStatus',
        header: 'SLA STATUS',
        cellType: 'badge',
        badgeField: 'slaStatus',
        badgeColor: (row: any) => this.getSlaBadgeColor(row.slaStatus),
        badgeTextColor: (row: any) => this.getSlaBadgeTextColor(row.slaStatus),
        sortable: false,
        width: '150px',
      },
      {
        key: 'lastChecked',
        header: 'LAST CHECKED',
        cellType: 'text',
        primaryField: 'lastChecked',
        sortable: false,
        width: '150px',
      },
      {
        key: 'dataSource',
        header: 'DATA SOURCE',
        cellType: 'text',
        primaryField: 'dataSource',
        sortable: false,
        width: '150px',
      },
      {
        key: 'actions',
        header: 'ACTIONS',
        cellType: 'actions',
        sortable: false,
        width: '200px',
        actionLinks: [
          {
            label: 'Check',
            color: 'var(--color-primary)',
            display: 'text',
            disabled: (row: any) => row?.manual === 'Manual',
          },
          {
            label: 'Add Incident',
            display: 'text',
            color: 'var(--color-red)',
            disabled: (row: any) => false
          },
        ],
      },
    ],
    data: [],
  });

  getTableConfigForCategory(categoryName: string): TableConfig {
    const cached = this.tableConfigCache.get(categoryName);
    if (cached) return cached;

    const data = this.assetControlPanelData();
    if (!data) {
      const empty = { ...this.tableConfig(), data: [] };
      return empty;
    }

    const category = data.kpiCategories.find(
      (cat) => cat.categoryName === categoryName
    );

    if (!category) {
      const empty = { ...this.tableConfig(), data: [] };
      return empty;
    }

    const processedData = category.kpis.map((kpi) => ({ ...kpi }));
    const config: TableConfig = {
      ...this.tableConfig(),
      data: processedData,
    };
    this.tableConfigCache.set(categoryName, config);
    return config;
  }

  getTotalItemsForCategory(categoryName: string): number {
    const data = this.assetControlPanelData();
    if (!data) return 0;

    const category = data.kpiCategories.find(
      (cat) => cat.categoryName === categoryName
    );

    return category ? category.kpis.length : 0;
  }

  breadcrumbs = signal<BreadcrumbItem[]>([
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Ministries', path: '/assets/by-ministry' },
    { label: 'Ministry', path: '/ministry-detail' },
    { label: 'Ministry Website', path: '/view-assets-detail' },
    { label: 'Compliance Report' }
  ]);

  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private api: ApiService,
    private utils: UtilsService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    // Fetch query parameters
    const assetId = this.activatedRoute.snapshot.queryParams['assetId'];
    this.previousPageMetadata.set({
      assetId: Number(assetId)
    });

    if (!assetId) {
      this.utils.showToast('Asset ID is required', 'Error', 'error');
      this.route.navigate(['/dashboard']);
      return;
    }

    this.loadAssetData();
  }

  loadAssetData(): void {
    this.api.getAssetControlPanelData(this.previousPageMetadata().assetId).subscribe({
      next: (response: ApiResponse<AssetControlPanelData>) => {
        if (response.isSuccessful) {
          this.breadcrumbs.set([
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Ministries', path: '/assets/by-ministry' },
            {
              label: response.data?.header?.ministry ?? '',
              path: '/ministry-detail',
              queryParams: { ministryId: response.data?.header?.ministryId ?? '' },
            },
            {
              label: response.data?.header?.assetName ?? '',
              path: '/view-assets-detail',
              queryParams: { id: this.previousPageMetadata().assetId,ministryId: response.data?.header?.ministryId ?? '' },
            },
            { label: 'Compliance Report' },
          ]);

          this.tableConfigCache.clear();
          this.assetControlPanelData.set(response.data as AssetControlPanelData);
        } else {
          this.utils.showToast(response.message || 'Failed to load asset data', 'Error', 'error');
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error loading asset data', 'error');
        this.route.navigate(['/dashboard']);
      }
    });
  }

  getBadgeColor(value: string | undefined | null, type: 'citizenImpact' | 'health' | 'risk'): string {
    if (!value) return 'var(--color-bg-quaternary)';

    const upperValue = value.toUpperCase();

    // Check for unknown status
    if (upperValue.includes('UNKNOWN') || upperValue.includes('N/A')) {
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'citizenImpact') {
      if (upperValue.includes('LOW')) return 'var(--color-green-light)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow-light)';
      if (upperValue.includes('HIGH')) return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'health') {
      if (upperValue.includes('GOOD') || upperValue.includes('EXCELLENT')) return 'var(--color-green-light)';
      if (upperValue.includes('AVERAGE') || upperValue.includes('FAIR')) return 'var(--color-yellow-light)';
      if (upperValue.includes('POOR') || upperValue.includes('CRITICAL')) return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'risk') {
      if (upperValue.includes('LOW')) return 'var(--color-green-light)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow-light)';
      if (upperValue.includes('HIGH')) return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    return 'var(--color-bg-quaternary)';
  }

  getBadgeTextColor(value: string | undefined | null, type: 'citizenImpact' | 'health' | 'risk'): string {
    if (!value) return 'var(--color-text-tertiary)';

    const upperValue = value.toUpperCase();

    // Check for unknown status
    if (upperValue.includes('UNKNOWN') || upperValue.includes('N/A')) {
      return 'var(--color-text-tertiary)';
    }

    if (type === 'citizenImpact') {
      if (upperValue.includes('LOW')) return 'var(--color-green-dark)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow)';
      if (upperValue.includes('HIGH')) return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    if (type === 'health') {
      if (upperValue.includes('GOOD') || upperValue.includes('EXCELLENT')) return 'var(--color-green-dark)';
      if (upperValue.includes('AVERAGE') || upperValue.includes('FAIR')) return 'var(--color-yellow)';
      if (upperValue.includes('POOR') || upperValue.includes('CRITICAL')) return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    if (type === 'risk') {
      if (upperValue.includes('LOW')) return 'var(--color-green-dark)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow)';
      if (upperValue.includes('HIGH')) return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    return 'var(--color-text-tertiary)';
  }

  getBadgeClass(badgeColor?: string): string {
    if (!badgeColor) return 'badge-success';

    // Extract color name from CSS variable to determine badge class
    if (badgeColor.includes('green')) return 'badge-success';
    if (badgeColor.includes('red')) return 'badge-danger';
    if (badgeColor.includes('yellow')) return 'badge-warning';

    return 'badge-success';
  }

  getStatusBoxClass(status: string | undefined | null): string {
    if (!status) return 'bg-light border border-secondary';

    const upperStatus = status.toUpperCase();
    if (upperStatus.includes('DOWN') || upperStatus.includes('OFFLINE')) {
      return 'bg-danger-subtle border border-danger';
    }
    if (upperStatus.includes('UP') || upperStatus.includes('ONLINE')) {
      return 'bg-success-subtle border border-success';
    }
    return 'bg-light border border-secondary';
  }

  getStatusTextClass(status: string | undefined | null): string {
    if (!status) return 'text-secondary';

    const upperStatus = status.toUpperCase();
    if (upperStatus.includes('DOWN') || upperStatus.includes('OFFLINE')) {
      return 'text-danger';
    }
    if (upperStatus.includes('UP') || upperStatus.includes('ONLINE')) {
      return 'text-success';
    }
    return 'text-secondary';
  }

  getSlaBadgeColor(slaStatus: string | undefined | null): string {
    if (!slaStatus) return 'var(--color-bg-quaternary)';

    const upperStatus = slaStatus.toUpperCase().trim();
    // Check NON-COMPLIANT first (so it doesn't match COMPLIANT)
    if (upperStatus.includes('NON-COMPLIANT') || upperStatus.includes('NON-COMPLIANT')) {
      return 'var(--color-red-light)';
    }
    if (upperStatus.includes('COMPLIANT') || upperStatus.includes('COMPLIANT')) {
      return 'var(--color-green-light)';
    }
    if (upperStatus.includes('UNKNOWN') || upperStatus.includes('N/A')) {
      return 'var(--color-bg-quaternary)';
    }
    return 'var(--color-bg-quaternary)';
  }

  getSlaBadgeTextColor(slaStatus: string | undefined | null): string {
    if (!slaStatus) return 'var(--color-text-tertiary)';

    const upperStatus = slaStatus.toUpperCase().trim();
    // Check NON-COMPLIANT first (so it doesn't match COMPLIANT)
    if (upperStatus.includes('NON-COMPLIANT') || upperStatus.includes('NON-COMPLIANT')) {
      return 'var(--color-red)';
    }
    if (upperStatus.includes('COMPLIANT') || upperStatus.includes('COMPLIANT')) {
      return 'var(--color-green-dark)';
    }
    if (upperStatus.includes('UNKNOWN') || upperStatus.includes('N/A')) {
      return 'var(--color-text-tertiary)';
    }
    return 'var(--color-text-tertiary)';
  }

  onCheckClick(row: any): void {
    console.log('Check clicked for KPI:', row);
    // Implement check functionality
  }

  onAddIncidentClick(row: any): void {
    const dialogRef = this.dialog.open(ManageIncidentsComponent, {
      width: '90%',
      maxWidth: '700px',
      data: {
        assetId: this.previousPageMetadata().assetId.toString(),
        kpiId: row.kpiId.toString(),
      },
      panelClass: 'responsive-modal',
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.loadAssetData();
      }
    });
  }

  onActionClick(event: { row: any; columnKey: string }): void {
    const { row, columnKey } = event;
    if (columnKey === 'Check') {
      this.onCheckClick(row);
    } else if (columnKey === 'Add Incident') {
      this.onAddIncidentClick(row);
    }
  }

}
