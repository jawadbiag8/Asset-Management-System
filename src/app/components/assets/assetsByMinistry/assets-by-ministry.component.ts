import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import { ApiResponse, ApiService } from '../../../services/api.service';
import {
  TableConfig,
  TableColumn,
  FilterPill,
} from '../../reusable/reusable-table/reusable-table.component';

export interface MinistryAssetData {
  ministryId: string;
  ministryName: string;
  departmentCount: number;
  assetCount: number;
  contactName: string;
  contactPhone: string;
  openIncidents: number;
  highSeverityIncidents: number;
  highSeverityText?: string;
}

@Component({
  selector: 'app-assets-by-ministry',
  templateUrl: './assets-by-ministry.component.html',
  styleUrl: './assets-by-ministry.component.scss',
  standalone: false,
})
export class AssetsByMinistryComponent implements OnInit, AfterViewInit {
  @ViewChild('tableContainer', { static: false }) tableContainer!: ElementRef;

  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  searchValue = signal<string>('');
  tableFilters = signal<FilterPill[]>([]);
  totalItems = signal<number>(0);
  private isLoadingData = false; // Flag to prevent infinite loop
  private lastSearchParams: string = ''; // Track last search params to prevent duplicate calls

  ministryData = signal<MinistryAssetData[]>([]);

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    serverSideSearch: true,
    defaultPage: 1,
    defaultPageSize: 10,
    columns: [
      {
        key: 'viewDetails',
        header: 'VIEW DETAILS',
        cellType: 'icon',
        iconUrl: '/assets/info-icon.svg',
        iconBgColor: 'var(--color-blue-light)',
        sortable: false,
        width: '120px',
      },
      {
        key: 'ministry',
        header: 'MINISTRY',
        cellType: 'text',
        primaryField: 'ministryName',
        sortable: true,
        width: '250px',
      },
      {
        key: 'departments',
        header: '# OF DEPARTMENTS',
        cellType: 'text',
        primaryField: 'departmentCount',
        sortable: true,
        width: '150px',
      },
      {
        key: 'assets',
        header: '# OF ASSETS',
        cellType: 'text',
        primaryField: 'assetCount',
        sortable: true,
        width: '130px',
      },
      {
        key: 'contact',
        header: 'CONTACT',
        cellType: 'two-line',
        primaryField: 'contactName',
        secondaryField: 'contactPhone',
        sortable: false,
        width: '200px',
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
        width: '180px',
      },
    ],
    data: [],
  });

  // Keep table config in sync with data - update directly instead of computed to avoid infinite loop
  tableConfigWithData = signal<TableConfig>({
    minWidth: '1400px',
    serverSideSearch: true,
    defaultPage: 1,
    defaultPageSize: 10,
    columns: [
      {
        key: 'viewDetails',
        header: 'VIEW DETAILS',
        cellType: 'icon',
        iconUrl: '/assets/info-icon.svg',
        iconBgColor: 'var(--color-blue-light)',
        sortable: false,
        width: '120px',
      },
      {
        key: 'ministry',
        header: 'MINISTRY',
        cellType: 'text',
        primaryField: 'ministryName',
        sortable: true,
        width: '250px',
      },
      {
        key: 'departments',
        header: '# OF DEPARTMENTS',
        cellType: 'text',
        primaryField: 'departmentCount',
        sortable: true,
        width: '150px',
      },
      {
        key: 'assets',
        header: '# OF ASSETS',
        cellType: 'text',
        primaryField: 'assetCount',
        sortable: true,
        width: '130px',
      },
      {
        key: 'contact',
        header: 'CONTACT',
        cellType: 'two-line',
        primaryField: 'contactName',
        secondaryField: 'contactPhone',
        sortable: false,
        width: '200px',
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
        width: '180px',
      },
    ],
    data: [],
  });

  constructor(
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Initial data will be loaded by table component on init via searchQuery event
  }

  loadMinistries(searchParams: HttpParams): void {
    // Prevent infinite loop - don't load if already loading
    if (this.isLoadingData) {
      return;
    }

    // Add default SortBy if not present
    if (!searchParams.has('SortBy')) {
      searchParams = searchParams.set('SortBy', 'ministryName');
    }

    // Convert params to string for comparison
    const paramsString = searchParams.toString();

    // Prevent duplicate calls with same parameters
    if (this.lastSearchParams === paramsString) {
      return;
    }

    this.lastSearchParams = paramsString;
    this.isLoadingData = true;
    this.loading.set(true);
    this.errorMessage.set('');

    this.apiService.getMinistries(searchParams).subscribe({
      next: (response: ApiResponse<any>) => {
        this.isLoadingData = false;
        this.loading.set(false);
        if (response.isSuccessful && response.data) {
          // Handle paginated response - check if data is in items array or directly
          const data = response.data.items || response.data.data || response.data;
          const total = response.data.totalCount || response.data.total || data?.length || 0;

          // Transform API data to match our interface
          const transformedData = this.transformApiData(Array.isArray(data) ? data : []);
          this.ministryData.set(transformedData);
          this.totalItems.set(total);

          // Update table config with new data - update only data property to avoid triggering unnecessary changes
          this.tableConfigWithData.update(config => ({
            ...config,
            data: transformedData
          }));

          // Reattach handlers after data is loaded
          setTimeout(() => {
            this.attachViewDetailsHandlers();
          }, 200);
        } else {
          this.errorMessage.set(response.message || 'Failed to load ministries');
          this.ministryData.set([]);
          this.tableConfigWithData.update(config => ({
            ...config,
            data: []
          }));
        }
      },
      error: (error) => {
        this.isLoadingData = false;
        this.loading.set(false);
        this.errorMessage.set('Error loading ministries. Please try again.');
        console.error('Error loading ministries:', error);
        this.ministryData.set([]);
        this.tableConfigWithData.update(config => ({
          ...config,
          data: []
        }));
      },
    });
  }

  private transformApiData(data: any[]): MinistryAssetData[] {
    // Transform API response to match our data structure
    return data.map((item) => ({
      ministryId: item.id?.toString() || item.ministryId?.toString() || '',
      ministryName: item.name || item.ministryName || '',
      departmentCount: item.departmentCount || item.numberOfDepartments || 0,
      assetCount: item.assetCount || item.numberOfAssets || 0,
      contactName: item.contactName || item.contact?.name || 'Name Here',
      contactPhone: item.contactPhone || item.contact?.phone || `Ph: ${item.contact?.phoneNumber || 'N/A'}`,
      openIncidents: item.openIncidents || item.numberOfOpenIncidents || 0,
      highSeverityIncidents: item.highSeverityIncidents || item.numberOfHighSeverityIncidents || 0,
      highSeverityText: `High severity: ${item.highSeverityIncidents || item.numberOfHighSeverityIncidents || 0}`,
    }));
  }

  onSearchChange(value: string): void {
    this.searchValue.set(value);
  }

  onFilterRemove(filterId: string): void {
    this.tableFilters.update((filters) =>
      filters.filter((f) => f.id !== filterId)
    );
  }

  onFilterClick(filter: FilterPill): void {
    // Handle filter click
    console.log('Filter clicked:', filter);
  }

  onFilterApply(filterChanges: { filterId: string; selectedValues: string[] }[]): void {
    // Handle filter apply
    console.log('Filters applied:', filterChanges);
  }

  ngAfterViewInit(): void {
    // Attach click handlers after view init and when data loads
    setTimeout(() => {
      this.attachViewDetailsHandlers();
    }, 200);
  }

  private attachViewDetailsHandlers(): void {
    if (!this.tableContainer) return;

    const iconContainers = this.tableContainer.nativeElement.querySelectorAll(
      '.assets-table td[mat-cell]:first-child .analyze-icon-container'
    );

    iconContainers.forEach((container: HTMLElement, index: number) => {
      // Remove existing click handlers by cloning
      const newContainer = container.cloneNode(true) as HTMLElement;
      container.parentNode?.replaceChild(newContainer, container);

      // Add click handler to the new container
      newContainer.addEventListener('click', () => {
        const data = this.ministryData();
        if (data && data[index]) {
          this.viewDetails(data[index].ministryId);
        }
      });
    });
  }

  viewDetails(ministryId: string): void {
    // Navigate to ministry details
    this.router.navigate(['/ministry-detail'], {
      queryParams: { ministryId },
    });
  }

  addDigitalAsset(): void {
    // Navigate to add asset page
    this.router.navigate(['/add-digital-assets']);
  }
}
