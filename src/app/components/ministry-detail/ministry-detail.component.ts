import {
  Component,
  signal,
  computed,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  TableConfig,
  TableColumn,
  FilterPill,
} from '../reusable/reusable-table/reusable-table.component';

export interface AssetDetail {
  id: number;
  actions: string;
  department: string;
  websiteName: string;
  websiteUrl: string;
  currentHealthStatus: string;
  currentHealthPercentage: string;
  lastOutageStatus: string;
  lastOutageUpdated: string;
  performanceSlaStatus: string;
  performanceSlaPercentage: string;
  complianceStatus: string;
  compliancePercentage: string;
  contentFreshnessStatus: string;
  contentFreshnessUpdated: string;
  citizenImpactLevel: string;
  satisfaction: string;
}

@Component({
  selector: 'app-ministry-detail',
  standalone: false,
  templateUrl: './ministry-detail.component.html',
  styleUrl: './ministry-detail.component.scss',
})
export class MinistryDetailComponent implements AfterViewInit {
  searchValue = signal<string>('');
  tableFilters = signal<FilterPill[]>([]);
  @ViewChild('tableContainer', { static: false }) tableContainer!: ElementRef;

  constructor(private router: Router) {}

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    columns: [
      {
        key: 'actions',
        header: 'ACTIONS',
        cellType: 'text',
        primaryField: 'actions',
        sortable: false,
      },
      {
        key: 'department',
        header: 'DEPARTMENT',
        cellType: 'text',
        primaryField: 'department',
        sortable: false,
      },
      {
        key: 'websiteApplication',
        header: 'WEBSITE / APPLICATION',
        cellType: 'link',
        primaryField: 'websiteName',
        linkField: 'websiteUrl',
        sortable: false,
      },
      {
        key: 'currentHealth',
        header: 'CURRENT HEALTH',
        cellType: 'two-line',
        primaryField: 'currentHealthStatus',
        secondaryField: 'currentHealthPercentage',
        sortable: false,
      },
      {
        key: 'lastOutage',
        header: 'LAST OUTAGE',
        cellType: 'two-line',
        primaryField: 'lastOutageStatus',
        secondaryField: 'lastOutageUpdated',
        sortable: false,
      },
      {
        key: 'performanceSla',
        header: 'PERFORMANCE SLA',
        cellType: 'badge-with-subtext',
        badgeField: 'performanceSlaStatus',
        subtextField: 'performanceSlaPercentage',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green)',
        sortable: false,
      },
      {
        key: 'complianceStatus',
        header: 'COMPLIANCE STATUS',
        cellType: 'text-with-color',
        primaryField: 'complianceStatus',
        secondaryField: 'compliancePercentage',
        textColor: 'success',
        sortable: false,
      },
      {
        key: 'contentFreshness',
        header: 'CONTENT FRESHNESS',
        cellType: 'two-line',
        primaryField: 'contentFreshnessStatus',
        secondaryField: 'contentFreshnessUpdated',
        sortable: false,
      },
      {
        key: 'citizenImpactLevel',
        header: 'CITIZEN IMPACT LEVEL',
        cellType: 'badge-with-subtext',
        badgeField: 'citizenImpactLevel',
        subtextField: 'satisfaction',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true,
      },
    ],
    data: [],
  });

  assetDetails = signal<AssetDetail[]>([
    {
      id: 1,
      actions: 'View Asset Details >',
      department: 'Health Service Department',
      websiteName: 'Health Dashboard',
      websiteUrl: 'https://gwadarport.gov.pk',
      currentHealthStatus: 'Unknown',
      currentHealthPercentage: '0.00%',
      lastOutageStatus: 'Never',
      lastOutageUpdated: 'Last Updated',
      performanceSlaStatus: 'MET',
      performanceSlaPercentage: '0%',
      complianceStatus: 'Compliant',
      compliancePercentage: '100%',
      contentFreshnessStatus: 'Never',
      contentFreshnessUpdated: 'Last Updated',
      citizenImpactLevel: 'LOW',
      satisfaction: 'Satisfaction: N/A',
    },
    {
      id: 2,
      actions: 'View Asset Details >',
      department: 'Health Service Department',
      websiteName: 'Health Portal Dashboard',
      websiteUrl: 'https://health.gov.example',
      currentHealthStatus: 'Unknown',
      currentHealthPercentage: '0.00%',
      lastOutageStatus: 'Never',
      lastOutageUpdated: 'Last Updated',
      performanceSlaStatus: 'MET',
      performanceSlaPercentage: '99%',
      complianceStatus: 'Compliant',
      compliancePercentage: '100%',
      contentFreshnessStatus: 'Never',
      contentFreshnessUpdated: 'Last Updated',
      citizenImpactLevel: 'HIGH',
      satisfaction: 'Satisfaction: N/A',
    },
    {
      id: 3,
      actions: 'View Asset Details >',
      department: 'Health Service Department',
      websiteName: 'Health Portal Dashboard',
      websiteUrl: 'https://health.gov.example',
      currentHealthStatus: 'Unknown',
      currentHealthPercentage: '0.00%',
      lastOutageStatus: 'Never',
      lastOutageUpdated: 'Last Updated',
      performanceSlaStatus: 'MET',
      performanceSlaPercentage: '99%',
      complianceStatus: 'Compliant',
      compliancePercentage: '100%',
      contentFreshnessStatus: 'Never',
      contentFreshnessUpdated: 'Last Updated',
      citizenImpactLevel: 'Intermadiate',
      satisfaction: 'Satisfaction: N/A',
    },
  ]);

  // Computed signal to keep table config in sync with data
  tableConfigWithData = computed<TableConfig>(() => ({
    ...this.tableConfig(),
    data: this.assetDetails(),
  }));

  onSearchChange(value: string) {
    this.searchValue.set(value);
    // Add your search filtering logic here
  }

  onFilterRemove(filterId: string) {
    this.tableFilters.update((filters) =>
      filters.filter((f) => f.id !== filterId),
    );
    // Add your filter removal logic here
  }

  onFilterClick(filterId: string | any) {
    // Add your filter dropdown logic here
    console.log('Filter clicked:', filterId);
  }

  onAddAsset() {
    // Navigate to add digital assets page
    this.router.navigate(['/add-digital-assets']);
  }

  ngAfterViewInit() {
    // Apply red colors to HIGH impact level badges
    setTimeout(() => {
      this.applyHighImpactColors();
    }, 0);
  }

  private applyHighImpactColors() {
    if (!this.tableContainer) return;

    const badges = this.tableContainer.nativeElement.querySelectorAll(
      '.assets-table td[mat-cell]:last-child .badge',
    );
    badges.forEach((badge: HTMLElement) => {
      if (badge.textContent?.trim() === 'HIGH') {
        badge.classList.add('high-impact');
      }
    });
  }
}
