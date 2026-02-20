import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { UtilsService } from '../../../services/utils.service';
import { FilterModalComponent } from '../filter-modal/filter-modal.component';

/**
 * ============================================================================
 * REUSABLE TABLE COMPONENT - COMPREHENSIVE USAGE GUIDE
 * ============================================================================
 *
 * A flexible, feature-rich table component with built-in search, filtering,
 * pagination, sorting, and multiple cell type support.
 *
 * ============================================================================
 * BASIC USAGE
 * ============================================================================
 *
 * 1. Import the component and types:
 *    ```typescript
 *    import { TableConfig, TableColumn, FilterPill } from '../reusable/reusable-table/reusable-table.component';
 *    ```
 *
 * 2. Define your table configuration:
 *    ```typescript
 *    tableConfig: TableConfig = {
 *      columns: [
 *         {
 *           key: 'name',
 *           header: 'NAME',
 *           cellType: 'text',
 *           primaryField: 'name',
 *           sortable: true,
 *           width: '200px'
 *         }
 *      ],
 *      data: yourDataArray,
 *      searchPlaceholder: 'Search...',
 *      serverSideSearch: false, // true for server-side, false for client-side
 *      defaultPage: 1,
 *      defaultPageSize: 10,
 *      emptyStateMessage: 'No data available'
 *    };
 *    ```
 *
 * 3. Use in template:
 *    ```html
 *    <app-reusable-table
 *      [config]="tableConfig"
 *      [filters]="filters"
 *      [totalItems]="totalItems"
 *      (searchQuery)="loadData($event)">
 *    </app-reusable-table>
 *    ```
 *
 * ============================================================================
 * CELL TYPES & CONFIGURATION
 * ============================================================================
 *
 * 1. TEXT CELL (cellType: 'text')
 *    - Simple text display
 *    ```typescript
 *    {
 *       key: 'name',
 *       header: 'NAME',
 *       cellType: 'text',
 *       primaryField: 'name', // Field name in data object
 *       sortable: true,
 *       width: '200px'
 *    }
 *    ```
 *
 * 2. TWO-LINE CELL (cellType: 'two-line')
 *    - Primary and secondary text
 *    ```typescript
 *    {
 *       key: 'health',
 *       header: 'HEALTH',
 *       cellType: 'two-line',
 *       primaryField: 'status',
 *       secondaryField: 'percentage',
 *       sortable: true
 *    }
 *    ```
 *
 * 3. BADGE CELL (cellType: 'badge')
 *    - Colored badge with text
 *    ```typescript
 *    {
 *       key: 'status',
 *       header: 'STATUS',
 *       cellType: 'badge',
 *       badgeField: 'status',
 *       badgeColor: 'var(--color-green-light)', // Static color
 *       // OR dynamic color:
 *       badgeColor: (row: any) => {
 *         if (row.status === 'ACTIVE') return 'var(--color-green-light)';
 *         return 'var(--color-red-light)';
 *       },
 *       badgeTextColor: 'var(--color-green-dark)', // Static
 *       // OR dynamic:
 *       badgeTextColor: (row: any) => this.getStatusTextColor(row),
 *       sortable: false
 *    }
 *    ```
 *
 * 4. BADGE WITH SUBTEXT (cellType: 'badge-with-subtext')
 *    - Badge with additional text below
 *    ```typescript
 *    {
 *       key: 'performance',
 *       header: 'PERFORMANCE',
 *       cellType: 'badge-with-subtext',
 *       badgeField: 'status',
 *       subtextField: 'percentage',
 *       badgeColor: 'var(--color-blue-light)',
 *       badgeTextColor: 'var(--color-blue-dark)',
 *       sortable: false
 *    }
 *    ```
 *
 * 5. LINK CELL (cellType: 'link')
 *    - Clickable link with primary text
 *    ```typescript
 *    {
 *       key: 'website',
 *       header: 'WEBSITE',
 *       cellType: 'link',
 *       primaryField: 'websiteName',
 *       linkField: 'websiteUrl', // Full URL field
 *       sortable: false
 *    }
 *    ```
 *
 * 6. ICON CELL (cellType: 'icon')
 *    - Material icon with background
 *    ```typescript
 *    {
 *       key: 'actions',
 *       header: 'ACTIONS',
 *       cellType: 'icon',
 *       iconName: 'bar_chart',
 *       iconColor: 'var(--color-blue-dark)',
 *       iconBgColor: 'var(--color-blue-light)',
 *       sortable: false
 *    }
 *    ```
 *
 * 7. TEXT WITH COLOR (cellType: 'text-with-color')
 *    - Text with color classes
 *    ```typescript
 *    {
 *       key: 'compliance',
 *       header: 'COMPLIANCE',
 *       cellType: 'text-with-color',
 *       primaryField: 'status',
 *       secondaryField: 'percentage',
 *       textColor: 'success', // 'success', 'success-light', etc.
 *       sortable: false
 *    }
 *    ```
 *
 * ============================================================================
 * TOOLTIP SUPPORT
 * ============================================================================
 *
 * Add tooltips to any column:
 * ```typescript
 * {
 *    key: 'name',
 *    header: 'NAME',
 *    cellType: 'text',
 *    primaryField: 'name',
 *    tooltip: 'This is a static tooltip', // Static tooltip
 *    // OR dynamic tooltip:
 *    tooltip: (row: any) => `Name: ${row.name}\nID: ${row.id}`, // Dynamic tooltip
 *    tooltipPosition: 'above' // 'above' | 'below' | 'left' | 'right'
 * }
 * ```
 *
 * ============================================================================
 * SEARCH FUNCTIONALITY
 * ============================================================================
 *
 * CLIENT-SIDE SEARCH:
 *    - Set serverSideSearch: false (default)
 *    - Search works automatically on all columns
 *    - No API call needed
 *    - Search is applied as you type
 *
 * SERVER-SIDE SEARCH:
 *    - Set serverSideSearch: true
 *    - Handle searchQuery event in parent:
 *    ```typescript
 *    loadData(searchParams: HttpParams) {
 *       this.apiService.getData(searchParams).subscribe((response: any) => {
 *          this.tableConfig.data = response.data;
 *          this.totalItems = response.total;
 *          this.tableConfig = { ...this.tableConfig }; // Trigger change detection
 *       });
 *    }
 *    ```
 *    - searchParams contains: pageNumber, pageSize, search, and filter params
 *    - Search button click triggers the search
 *
 * ============================================================================
 * FILTER FUNCTIONALITY
 * ============================================================================
 *
 * 1. Define filters:
 *    ```typescript
 *    filters: FilterPill[] = [
 *       {
 *          id: 'ministry',
 *          label: 'Ministry: All',
 *          value: 'All',
 *          removable: false,
 *          paramKey: 'ministry', // API parameter key
 *          options: [
 *             { label: 'All', value: 'All' },
 *             { label: 'Health', value: 'Health' },
 *             { label: 'Finance', value: 'Finance' }
 *          ]
 *       }
 *    ];
 *    ```
 *
 * 2. Pass filters to table:
 *    ```html
 *    <app-reusable-table [filters]="filters" ...>
 *    ```
 *
 * 3. Filters are handled internally by table component
 *    - Click filter pill to open modal
 *    - Select option from dropdown
 *    - Filter updates automatically
 *    - For server-side: searchQuery event emits with updated filters
 *    - No need to implement onFilterRemove, onFilterApply in parent
 *
 * ============================================================================
 * PAGINATION
 * ============================================================================
 *
 * CLIENT-SIDE PAGINATION:
 *    - Works automatically when serverSideSearch: false
 *    - No configuration needed
 *    - Pagination controls appear automatically
 *
 * SERVER-SIDE PAGINATION:
 *    - Set serverSideSearch: true
 *    - Pass totalItems:
 *    ```typescript
 *    totalItems = 100; // Total items from server
 *    ```
 *    ```html
 *    <app-reusable-table [totalItems]="totalItems" ...>
 *    ```
 *    - Handle page changes in searchQuery event
 *    - searchParams contains 'pageNumber' and 'pageSize'
 *
 * PAGINATION OPTIONS:
 *    - Default page: defaultPage: 1
 *    - Default page size: defaultPageSize: 10
 *    - Available page sizes: 5, 10, 25, 50, 100
 *    - User can change page size from dropdown
 *
 * ============================================================================
 * SORTING
 * ============================================================================
 *
 * Enable sorting on any column:
 * ```typescript
 * {
 *    key: 'name',
 *    header: 'NAME',
 *    cellType: 'text',
 *    primaryField: 'name',
 *    sortable: true // Enable sorting (default: true)
 * }
 * ```
 *
 * Disable sorting:
 * ```typescript
 * {
 *    sortable: false // Disable sorting
 * }
 * ```
 *
 * - Click header to sort (asc -> desc -> unsorted)
 * - Works automatically for client-side
 * - For server-side: sorting params included in searchQuery event
 *
 * ============================================================================
 * EMPTY STATE
 * ============================================================================
 *
 * Show message when no data:
 * ```typescript
 * tableConfig: TableConfig = {
 *    // ... other config
 *    emptyStateMessage: 'No data available at this time.'
 * }
 * ```
 *
 * ============================================================================
 * COMPLETE EXAMPLE
 * ============================================================================
 *
 * ```typescript
 * // Component
 * export class MyComponent {
 *    tableConfig: TableConfig = {
 *       columns: [
 *          {
 *             key: 'name',
 *             header: 'NAME',
 *             cellType: 'text',
 *             primaryField: 'name',
 *             sortable: true,
 *             width: '200px',
 *             tooltip: (row: any) => `Full name: ${row.name}`
 *          },
 *          {
 *             key: 'status',
 *             header: 'STATUS',
 *             cellType: 'badge',
 *             badgeField: 'status',
 *             badgeColor: (row: any) => this.getStatusColor(row),
 *             badgeTextColor: (row: any) => this.getStatusTextColor(row),
 *             sortable: false
 *          }
 *       ],
 *       data: [],
 *       searchPlaceholder: 'Search assets...',
 *       serverSideSearch: true,
 *       defaultPage: 1,
 *       defaultPageSize: 10,
 *       emptyStateMessage: 'No assets found'
 *    };
 *
 *    filters: FilterPill[] = [
 *       {
 *          id: 'ministry',
 *          label: 'Ministry: All',
 *          value: 'All',
 *          removable: false,
 *          paramKey: 'ministry',
 *          options: [
 *             { label: 'All', value: 'All' },
 *             { label: 'Health', value: 'Health' }
 *          ]
 *       }
 *    ];
 *
 *    totalItems = 0;
 *
 *    loadData(searchParams: HttpParams) {
 *       this.apiService.getAssets(searchParams).subscribe((response: any) => {
 *          this.tableConfig.data = response.data;
 *          this.totalItems = response.total;
 *          this.tableConfig = { ...this.tableConfig };
 *       });
 *    }
 * }
 * ```
 *
 * ```html
 * <!-- Template -->
 * <app-reusable-table
 *    [config]="tableConfig"
 *    [filters]="filters"
 *    [totalItems]="totalItems"
 *    (searchQuery)="loadData($event)">
 * </app-reusable-table>
 * ```
 *
 * ============================================================================
 * IMPORTANT NOTES
 * ============================================================================
 *
 * - All search, filter, and pagination logic is handled internally by table
 * - Parent component only needs to handle API calls (for server-side)
 * - No need to implement onSearchChange, onFilterRemove, etc. in parent
 * - searchValue is managed internally by table component
 * - Filters are updated internally when user interacts
 * - For server-side: searchQuery event emits HttpParams with all query params
 * - For client-side: everything works automatically
 * - searchQuery event contains: pageNumber, pageSize, search, and all filter params
 * - When filters change, searchQuery automatically emits (for server-side)
 * - When page changes, searchQuery automatically emits (for server-side)
 * - When page size changes, searchQuery automatically emits (for server-side)
 *
 * ============================================================================
 */

export type CellType =
  | 'text'
  | 'two-line'
  | 'badge'
  | 'icon'
  | 'link'
  | 'badge-with-subtext'
  | 'text-with-color'
  | 'health-status'
  | 'actions'
  | 'progress-bar';

export interface TableColumn {
  key: string; // Unique identifier for the column
  header: string; // Column header text
  cellType: CellType; // Type of cell rendering
  sortable?: boolean; // Whether column is sortable (default: true)
  width?: string; // Optional column width

  /** For server-side sort: API SortBy param. If set, sent instead of column key. */
  sortByKey?: string;

  // For 'text' and 'two-line' cells
  primaryField?: string; // Field name for primary text
  secondaryField?: string; // Field name for secondary text (two-line only)

  // For 'text' cells with icon (uses iconName/iconUrl from icon cells)
  showIcon?: boolean; // Show icon next to text

  // For 'badge' and 'badge-with-subtext' cells
  badgeField?: string; // Field name for badge text
  badgeColor?: string | ((row: any) => string); // Background color (CSS variable or hex) or function that returns color
  badgeTextColor?: string | ((row: any) => string); // Text color (CSS variable or hex) or function that returns color
  subtextField?: string; // Field name for subtext (badge-with-subtext only)
  /** When true, subtext is shown only in tooltip (set tooltip to a function returning subtext) and not below the badge. */
  subtextAsTooltip?: boolean;

  // For 'icon' cells
  iconName?: string; // Material icon name
  iconUrl?: string; // Custom SVG icon URL path
  iconColor?: string; // Icon color (CSS variable or hex)
  iconBgColor?: string; // Icon background color (CSS variable or hex)

  // For 'link' cells
  linkField?: string; // Field name for full URL

  /** For 'two-line' cells: make primary text an internal route link. When set, primary line is rendered as routerLink. */
  routerLinkFn?: (row: any) => { commands: any[]; queryParams?: { [k: string]: any } };

  /** For 'two-line' cells: optional button shown to the right of the text. */
  trailingButtonLabel?: string;
  trailingButtonClick?: (row: any) => void;

  // For 'text-with-color' cells
  textColor?: string | ((row: any) => string); // Color class name (e.g., 'success', 'warning', 'danger') or function that returns color class

  // For tooltip
  tooltip?: string | ((row: any) => string); // Tooltip text (static or function that returns tooltip based on row data)
  tooltipPosition?: 'above' | 'below' | 'left' | 'right' | 'before' | 'after'; // Tooltip position (default: 'above')

  // For 'health-status' cells
  healthStatusField?: string; // Field name for health status (e.g., 'currentHealthStatus')
  healthIconField?: string; // Field name for icon name (e.g., 'currentHealthIcon')
  healthPercentageField?: string; // Field name for health percentage (e.g., 'currentHealthPercentage')

  // For 'progress-bar' cells
  progressValueField?: string; // Field name for progress percentage value (e.g., 'percentage')
  progressColor?: string | ((row: any) => string); // Progress bar color (CSS variable or hex) or function that returns color
  progressShowLabel?: boolean; // Whether to show percentage label next to progress bar (default: true)

  // For custom CSS classes
  cellClass?: string; // CSS class name to apply to the cell content

  // For click handlers (e.g., for icon cells)
  onClick?: (row: any) => void; // Click handler function that receives the row data

  // For 'actions' cells
  actionLinks?: Array<{
    label: string; // Display text when display is 'text'; used for aria-label/tooltip when 'icon'
    display?: 'icon' | 'text'; // 'text' = show label, 'icon' = show Material icon
    iconName?: string; // Material icon name (e.g. 'edit', 'visibility') when display is 'icon'
    color?: string; // CSS color for icon or text
    disabled?: boolean | ((row: any) => boolean); // When true or function returns true, button is disabled
  }>;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterPill {
  id: string;
  label: string; // Display label (e.g., "Ministry: Health")
  value: string; // Current selected value
  removable?: boolean;
  options?: FilterOption[]; // Available options for this filter
  paramKey?: string; // API parameter key (e.g., "ministry", "status")
}

export interface TableConfig {
  columns: TableColumn[]; // Array of column definitions
  data: any[]; // Array of data objects
  minWidth?: string; // Minimum table width (default: '1400px')
  // Search configuration
  searchPlaceholder?: string; // Placeholder text for search input
  serverSideSearch?: boolean; // Enable server-side search (default: false)
  searchDebounceTime?: number; // Debounce time in milliseconds (default: 500)
  // Pagination configuration
  defaultPage?: number; // Default page number (default: 1)
  defaultPageSize?: number; // Default page size (default: 10)
  // Filter configuration
  filters?: FilterPill[]; // Array of filter pills to display
  // Empty state configuration
  emptyStateMessage?: string; // Message to display when table has no data (default: 'No data available')
}

@Component({
  selector: 'app-reusable-table',
  templateUrl: './reusable-table.component.html',
  styleUrl: './reusable-table.component.scss',
  standalone: false,
})
export class ReusableTableComponent
  implements OnInit, AfterViewInit, OnChanges
{
  @Input() config!: TableConfig;
  @Input() filters: FilterPill[] = []; // Filters controlled from parent (initial state)
  @Input() totalItems?: number; // Total items count for server-side pagination

  @Output() searchQuery = new EventEmitter<HttpParams>(); // Emit search query parameter as HttpParams (for server-side)
  @Output() actionClick = new EventEmitter<{ row: any; columnKey: string }>(); // Emit row data when icon/action is clicked

  // Internal search value - no longer needs to be passed from parent
  searchValue: string = '';

  displayedColumns: string[] = [];
  sortState: { [key: string]: 'asc' | 'desc' | null } = {};
  sortedData: any[] = [];
  filteredData: any[] = [];
  private originalData: any[] = [];
  private lastQueryKey: string | null = null;

  // Pagination state
  currentPage: number = 1;
  pageSize: number = 10;
  paginatedData: any[] = [];

  // Static variable to preserve currentPage across component recreation
  private static lastCurrentPage: number = 1;
  private static lastPageSize: number = 10;
  private static isFirstLoad: boolean = true; // Track if this is the very first load

  // Store last search params for refresh functionality
  private lastSearchParams: HttpParams = new HttpParams();

  // Get effective totalItems (from input or computed from data)
  get effectiveTotalItems(): number {
    if (this.config?.serverSideSearch && this.totalItems !== undefined) {
      return this.totalItems;
    }
    // For client-side, compute from data
    if (this.searchValue && this.searchValue.trim()) {
      return this.filteredData.length;
    }
    return this.originalData.length;
  }

  constructor(
    private utilsService: UtilsService,
    private router: Router,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    if (this.config && this.config.columns) {
      this.displayedColumns = this.config.columns.map((col) => col.key);
    }
    // Initialize filters from config if provided
    if (this.config?.filters && this.filters.length === 0) {
      this.filters = this.config.filters;
    }

    // CRITICAL: Check if component is being recreated with existing data AFTER a pagination action
    // If data exists AND it's NOT the first load, it means component was recreated after API response
    // In this case, restore currentPage from static variable and DON'T emit query
    const hasExistingData = this.config?.data && this.config.data.length > 0;
    const isRecreationAfterPagination =
      hasExistingData && !ReusableTableComponent.isFirstLoad;

    if (isRecreationAfterPagination) {
      // Component recreated with data (after pagination action)
      // Restore currentPage from static variable to preserve pagination state
      this.currentPage = ReusableTableComponent.lastCurrentPage;
      this.pageSize = ReusableTableComponent.lastPageSize;
      // Only update displayed data, don't emit query
      this.sortedData = [...this.config.data];
      // DON'T emit query - the user action already emitted it
      return; // Exit early - don't reset pagination or emit query
    }

    // Mark first load as complete
    ReusableTableComponent.isFirstLoad = false;

    // True initial load (no data exists OR data exists but no preserved page)
    // Initialize pagination with defaults
    this.currentPage = this.config?.defaultPage || 1;
    this.pageSize = this.config?.defaultPageSize || 10;

    // Store in static variable for future recreations
    ReusableTableComponent.lastCurrentPage = this.currentPage;
    ReusableTableComponent.lastPageSize = this.pageSize;

    // Initialize data
    this.originalData = [...(this.config?.data || [])];
    this.sortedData = [...this.originalData];

    // For server-side search, emit initial query on first load
    // This will happen even if mock data exists (like in dashboard)
    // The API will replace the mock data with real data
    if (this.config?.serverSideSearch) {
      // Initialize lastSearchParams with default values
      this.lastSearchParams = new HttpParams()
        .set('page', this.currentPage.toString())
        .set('pageSize', this.pageSize.toString());
      this.emitSearchQuery();
    } else {
      // For client-side search, apply search immediately
      this.applySearch();
      if (!this.config?.serverSideSearch) {
        this.applyPagination();
      }
    }
  }

  ngAfterViewInit(): void {
    // Register this table component with utils service after view is initialized
    // This ensures the component is fully ready before registration
    this.utilsService.registerTableComponent(this);
  }

  ngOnChanges(changes: SimpleChanges) {
    /* =========================
     SERVER-SIDE MODE
     ========================= */
    if (this.config?.serverSideSearch) {
      // Sync filters from parent when parent updates (e.g. after KPI click or syncFiltersFromParams)
      if (changes['filters'] && changes['filters'].currentValue) {
        this.filters = changes['filters'].currentValue;
        // Reset guard so next emit (e.g. on filter remove) is not blocked when params match initial load
        this.lastQueryKey = null;
      }
      // ✅ Only update displayed data when server responds
      if (
        changes['config'] &&
        this.config?.data &&
        Array.isArray(this.config.data)
      ) {
        // CRITICAL: Preserve currentPage when data updates
        // Don't reset pagination - it's already set by user action
        const preservedPage = this.currentPage;
        this.sortedData = [...this.config.data];
        // Ensure currentPage is preserved
        this.currentPage = preservedPage;
        // ❌ NO originalData
        // ❌ NO filteredData
        // ❌ NO pagination reset
        // ❌ NO currentPage reset
      }

      // ❌ Ignore searchValue changes (server-side = button click only)
      return; // 🔥 VERY IMPORTANT
    }

    /* =========================
     CLIENT-SIDE MODE
     ========================= */

    // Update data when config changes (no client-side sorting)
    if (
      changes['config'] &&
      this.config?.data &&
      Array.isArray(this.config.data)
    ) {
      this.originalData = [...this.config.data];
      this.sortedData = [...this.originalData];

      this.applySearch();
      this.applyPagination();
    } else if (
      changes['config'] &&
      (!this.config?.data || !Array.isArray(this.config.data))
    ) {
      // If data is not an array
      this.originalData = [];
      this.sortedData = [];
      this.filteredData = [];
    }

    // Search triggers on (change) / Enter / button only, not on every keyup
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchValue = value;

    // For client-side search, apply immediately (no client-side sort)
    if (!this.config?.serverSideSearch) {
      this.applySearch();
      this.applyPagination();
    }
  }

  onSearchButtonClick() {
    if (this.config?.serverSideSearch) {
      this.emitSearchQuery();
    } else {
      this.applySearch();
      this.applyPagination();
    }
  }

  private emitSearchQuery() {
    const searchValue = this.searchValue?.trim() || '';

    // Use PascalCase parameter names to match backend API (OpenAPI spec)
    let httpParams = new HttpParams()
      .set('PageNumber', this.currentPage.toString())
      .set('PageSize', this.pageSize.toString());

    if (searchValue) {
      // Text search parameter expected by backend
      httpParams = httpParams.set('SearchTerm', searchValue);
    }

    this.filters.forEach((filter) => {
      if (
        filter.paramKey &&
        filter.value &&
        filter.value !== '' &&
        filter.value !== 'All'
      ) {
        httpParams = httpParams.set(filter.paramKey, filter.value);
      }
    });

    // Server-side sorting: 1st click SortBy+SortDescending=false, 2nd SortBy+SortDescending=true, 3rd no SortBy
    const activeSortColumnKey = Object.keys(this.sortState).find(
      (key) => this.sortState[key] !== null,
    );
    if (activeSortColumnKey && this.config?.serverSideSearch) {
      const sortByKey = this.getSortByParamForColumn(activeSortColumnKey);
      const sortDirection = this.sortState[activeSortColumnKey];
      if (sortByKey) {
        httpParams = httpParams
          .set('SortBy', sortByKey)
          .set('SortDescending', sortDirection === 'desc' ? 'true' : 'false');
      }
    }

    // Store the last search params for refresh functionality
    this.lastSearchParams = httpParams;

    // 🔒 GUARD: prevent duplicate emits (asc/desc/null alag queryKey)
    const sortGuard = activeSortColumnKey
      ? `${activeSortColumnKey}:${this.sortState[activeSortColumnKey] ?? ''}`
      : 'none';
    const queryKey = httpParams.toString() + '|' + sortGuard;
    if (this.lastQueryKey === queryKey) {
      return; // ❌ BLOCK duplicate call
    }

    this.lastQueryKey = queryKey;
    this.searchQuery.emit(httpParams);
  }

  /** SortBy API param = column key (jis column pe sort, usi ki key). */
  private getSortByParamForColumn(columnKey: string): string | null {
    const column = this.config?.columns.find((col) => col.key === columnKey);
    if (!column) return null;
    return column.sortByKey ?? column.key;
  }

  onRefresh(): void {
    // Reload data with the last search parameters
    if (this.config?.serverSideSearch) {
      this.searchQuery.emit(this.lastSearchParams);
    } else {
      // For client-side, reapply search and pagination
      this.applySearch();
      this.currentPage = 1;
      this.applyPagination();
    }
  }

  private applySearch() {
    if (!this.searchValue || this.searchValue.trim() === '') {
      this.sortedData = [...this.originalData];
      this.filteredData = [...this.originalData];
      return;
    }

    const searchTerm = this.searchValue.toLowerCase().trim();
    this.filteredData = this.originalData.filter((row) => {
      // Search across all columns
      return this.config.columns.some((column) => {
        let cellValue: any = '';

        // Get cell value based on column type
        if (
          column.cellType === 'text' ||
          column.cellType === 'two-line' ||
          column.cellType === 'text-with-color'
        ) {
          const primary = this.getNestedValue(
            row,
            column.primaryField || column.key,
          );
          const secondary = this.getNestedValue(
            row,
            column.secondaryField || '',
          );
          cellValue = `${primary || ''} ${secondary || ''}`.trim();
        } else if (
          column.cellType === 'badge' ||
          column.cellType === 'badge-with-subtext'
        ) {
          const badge = this.getNestedValue(
            row,
            column.badgeField || column.key,
          );
          const subtext = this.getNestedValue(row, column.subtextField || '');
          cellValue = `${badge || ''} ${subtext || ''}`.trim();
        } else if (column.cellType === 'link') {
          const primary = this.getNestedValue(row, column.primaryField || '');
          const link = this.getNestedValue(row, column.linkField || '');
          cellValue = `${primary || ''} ${link || ''}`.trim();
        } else {
          cellValue = this.getNestedValue(
            row,
            column.primaryField || column.key,
          );
        }

        // Convert to string and search
        const valueStr = String(cellValue || '').toLowerCase();
        return valueStr.includes(searchTerm);
      });
    });

    // Update sorted data with filtered data
    this.sortedData = [...this.filteredData];
    if (!this.config?.serverSideSearch) {
      this.currentPage = 1;
    } // Reset to first page on search
    if (!this.config?.serverSideSearch) {
      this.applyPagination();
    }
  }

  onFilterRemove(filterId: string) {
    // Reset filter to "All" (empty string) instead of removing it
    this.filters = this.filters.map((filter) => {
      if (filter.id === filterId) {
        return {
          ...filter,
          value: '',
          label: `${filter.label.split(':')[0]}: All`,
          removable: false,
        };
      }
      return filter;
    });

    // For server-side search, emit query with updated filters
    if (this.config?.serverSideSearch) {
      this.emitSearchQuery();
    } else {
      // For client-side, reapply search
      this.applySearch();
      if (!this.config?.serverSideSearch) {
        this.currentPage = 1;
      } // Reset to first page
      this.applyPagination();
    }
  }

  openFilterDialog() {
    const dialogRef = this.dialog.open(FilterModalComponent, {
      width: '90%',
      maxWidth: '600px',
      data: { filters: this.filters },
      panelClass: 'filter-options-dialog',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.filterChanges) {
        this.onFilterApply(result.filterChanges);
      } else if (result?.reset) {
        this.onFilterReset();
      }
    });
  }

  onFilterClick(filter: FilterPill) {
    this.openFilterDialog();
  }

  onFilterApply(
    filterChanges: { filterId: string; selectedValues: string[] }[],
  ) {
    // Update all filters at once based on changes
    this.filters = this.filters.map((filter) => {
      const change = filterChanges.find((c) => c.filterId === filter.id);
      if (change) {
        const selectedValue = change.selectedValues[0] || '';
        const isAll = selectedValue === '' || selectedValue === 'All';

        // Build label based on selected value
        let labelText = filter.label.split(':')[0];
        if (isAll) {
          labelText += ': All';
        } else {
          const option = filter.options?.find(
            (opt) => opt.value === selectedValue,
          );
          labelText += `: ${option?.label || selectedValue}`;
        }

        return {
          ...filter,
          value: selectedValue,
          label: labelText,
          removable: !isAll,
        };
      }
      return filter;
    });

    // For server-side search, emit query with updated filters
    if (this.config?.serverSideSearch) {
      this.emitSearchQuery();
    } else {
      // For client-side, reapply search
      this.applySearch();
      if (!this.config?.serverSideSearch) {
        this.currentPage = 1;
      }
      this.applyPagination();
    }
  }

  onFilterReset() {
    // Reset all filters to "All" (empty string)
    this.filters = this.filters.map((filter) => ({
      ...filter,
      value: '',
      label: `${filter.label.split(':')[0]}: All`,
      removable: false,
    }));

    // For server-side search, emit query with updated filters
    if (this.config?.serverSideSearch) {
      this.emitSearchQuery();
    } else {
      // For client-side, reapply search
      this.applySearch();
      if (!this.config?.serverSideSearch) {
        this.currentPage = 1;
      }
      this.applyPagination();
    }
  }

  onSort(columnKey: string) {
    const column = this.config.columns.find((col) => col.key === columnKey);
    if (!column || column.sortable === false) return;

    const currentSort = this.sortState[columnKey];
    let newSort: 'asc' | 'desc' | null;

    // 3-state cycle: null → asc → desc → null (har click pe alag queryKey → API call)
    if (currentSort === 'asc') {
      newSort = 'desc';
    } else if (currentSort === 'desc') {
      newSort = null;
    } else {
      newSort = 'asc';
    }

    // Reset other columns
    Object.keys(this.sortState).forEach((key) => {
      if (key !== columnKey) {
        this.sortState[key] = null;
      }
    });

    this.sortState[columnKey] = newSort;

    // Sorting is server-side only: sortable column click → API call (no local sort)
    if (this.config?.serverSideSearch) {
      this.emitSearchQuery();
    }
  }

  getSortIcon(columnKey: string): string {
    const sort = this.sortState[columnKey];
    if (sort === 'asc') {
      return 'arrow_drop_up';
    } else if (sort === 'desc') {
      return 'arrow_drop_down';
    }
    return 'arrow_drop_down'; // Default to down arrow when not sorted
  }

  getSortIconClass(columnKey: string): string {
    const sort = this.sortState[columnKey];
    if (sort === null) {
      return 'sort-icon-unsorted';
    }
    return 'sort-icon-sorted';
  }

  getCellValue(row: any, field: string): any {
    return field ? this.getNestedValue(row, field) : '';
  }

  isRouterLink(link: any): boolean {
    return !!(link && typeof link === 'string' && link.startsWith('/'));
  }

  navigateToLink(link: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    if (this.isRouterLink(link)) {
      this.router.navigateByUrl(link);
    }
  }

  onIconClick(row: any, columnKey: string): void {
    this.actionClick.emit({ row, columnKey });
  }

  /** Default text cell click: stop propagation and call column.onClick(row) if defined */
  onTextCellClick(event: Event, column: TableColumn, row: any): void {
    if (!column.onClick) return;
    event.stopPropagation();
    column.onClick(row);
  }

  getActionDisabled(
    row: any,
    action: { disabled?: boolean | ((row: any) => boolean) },
  ): boolean {
    if (action.disabled === undefined || action.disabled === null) return false;
    if (typeof action.disabled === 'boolean') return action.disabled;
    try {
      return action.disabled(row) === true;
    } catch {
      return false;
    }
  }

  onActionLinkClick(row: any, actionLabel: string): void {
    this.actionClick.emit({ row, columnKey: actionLabel });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  getBadgeColor(row: any, column: TableColumn): string {
    if (!column.badgeColor) return '';
    if (typeof column.badgeColor === 'function') {
      return column.badgeColor(row);
    }
    return column.badgeColor;
  }

  getBadgeTextColor(row: any, column: TableColumn): string {
    if (!column.badgeTextColor) return '';
    if (typeof column.badgeTextColor === 'function') {
      return column.badgeTextColor(row);
    }
    return column.badgeTextColor;
  }

  getProgressValue(row: any, column: TableColumn): number {
    if (!column.progressValueField) return 0;
    const value = this.getCellValue(row, column.progressValueField);
    // Handle both number and string with % sign
    if (typeof value === 'number') {
      return Math.min(100, Math.max(0, value));
    }
    if (typeof value === 'string') {
      const numValue = parseFloat(value.replace('%', '').trim());
      return isNaN(numValue) ? 0 : Math.min(100, Math.max(0, numValue));
    }
    return 0;
  }

  getProgressColor(row: any, column: TableColumn): string {
    if (!column.progressColor) {
      // Default color based on percentage using CSS variables
      const value = this.getProgressValue(row, column);
      if (value >= 70) return 'var(--color-green)'; // Green for 70% and above
      if (value >= 30) return 'var(--color-orange)'; // Orange for 30% to 70%
      return 'var(--color-red)'; // Red for less than 30%
    }
    if (typeof column.progressColor === 'function') {
      return column.progressColor(row);
    }
    return column.progressColor;
  }

  /** Progress bar track background: light shade matching fill (green-light / orange-light / red-light) */
  getProgressBgColor(row: any, column: TableColumn): string {
    const value = this.getProgressValue(row, column);
    if (value >= 70) return 'var(--color-green-light)';
    if (value >= 30) return 'var(--color-orange-light)';
    return 'var(--color-red-light)';
  }

  getTooltipText(row: any, column: TableColumn): string {
    if (!column.tooltip) {
      return '';
    }
    if (typeof column.tooltip === 'function') {
      return column.tooltip(row);
    }
    return column.tooltip;
  }

  hasTooltip(column: TableColumn): boolean {
    return !!column.tooltip;
  }

  getBadgeClass(badgeColor?: string): string {
    if (!badgeColor) return 'badge-success';
    return `badge-${badgeColor}`;
  }

  getTextColorClass(row: any, column: TableColumn): string {
    if (!column.textColor) return '';
    const textColor =
      typeof column.textColor === 'function'
        ? column.textColor(row)
        : column.textColor;
    if (!textColor) return '';
    return `text-${textColor}`;
  }

  getSecondaryTextColorClass(row: any, column: TableColumn): string {
    // Always return empty string to use default color for secondary text
    return '';
  }

  getHealthIconPath(iconField?: string): string {
    if (!iconField) return '/Images/Table/unknown.svg';

    // Map icon field values to SVG paths
    const iconMap: { [key: string]: string } = {
      check_circle: '/Images/Table/check.svg',
      error: '/Images/Table/cancel.svg',
      warning: '/Images/Table/warning-triangle.svg',
      help_outline: '/Images/Table/unknown.svg',
      critical: '/Images/Table/cancel.svg',
      healthy: '/Images/Table/check.svg',
      unknown: '/Images/Table/unknown.svg',
      average: '/Images/Table/warning-triangle.svg',
      poor: '/Images/Table/cancel.svg',
      issues: '/Images/Table/warning-triangle.svg',
    };

    return iconMap[iconField.toLowerCase()] || '/Images/Table/unknown.svg';
  }

  getHealthIconClass(iconField?: string): string {
    if (!iconField) return 'health-icon-unknown';

    const icon = iconField.toLowerCase();

    if (icon === 'check_circle' || icon === 'healthy') {
      return 'health-icon-healthy';
    } else if (
      icon === 'error' ||
      icon === 'critical' ||
      icon === 'poor' ||
      icon === 'cancel'
    ) {
      return 'health-icon-critical';
    } else if (icon === 'warning' || icon === 'average' || icon === 'issues') {
      return 'health-icon-warning';
    } else {
      return 'health-icon-unknown';
    }
  }

  // Pagination methods
  applyPagination() {
    if (this.config?.serverSideSearch) {
      // For server-side pagination, don't slice data here
      // Data will come from server already paginated
      return;
    }
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.sortedData.slice(startIndex, endIndex);
    // Update sortedData to show paginated data in table
    this.sortedData = this.paginatedData;
  }

  get totalPages(): number {
    return Math.ceil(this.effectiveTotalItems / this.pageSize) || 1;
  }

  getDisplayedRange(): string {
    const total = this.effectiveTotalItems;
    const start = total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, total);
    return `${start}-${end}`;
  }

  onPageSizeChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.pageSize = parseInt(selectElement.value, 10);

    // Reset pageNumber to 1 when pageSize changes (for both server-side and client-side)
    this.currentPage = 1;

    // Store in static variable to preserve across component recreation
    ReusableTableComponent.lastCurrentPage = this.currentPage;
    ReusableTableComponent.lastPageSize = this.pageSize;

    if (this.config?.serverSideSearch) {
      this.emitSearchQuery();
    } else {
      this.applyPagination();
    }
  }

  onPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;

      // Store in static variable to preserve across component recreation
      ReusableTableComponent.lastCurrentPage = this.currentPage;
      ReusableTableComponent.lastPageSize = this.pageSize;

      if (this.config?.serverSideSearch) {
        this.emitSearchQuery();
      } else {
        this.applyPagination();
      }
    }
  }

  onNextPage() {
    if (this.currentPage < this.totalPages) {
      // Increment page BEFORE emitting query
      this.currentPage++;

      // Store in static variable to preserve across component recreation
      ReusableTableComponent.lastCurrentPage = this.currentPage;
      ReusableTableComponent.lastPageSize = this.pageSize;

      if (this.config?.serverSideSearch) {
        // Emit query with updated pageNumber
        // When component recreates, ngOnInit will restore currentPage from static variable
        this.emitSearchQuery();
      } else {
        this.applyPagination();
      }
    }
  }

  onFirstPage() {
    if (this.currentPage > 1) {
      if (!this.config?.serverSideSearch) {
        this.currentPage = 1;
      } else {
        this.currentPage = 1;
      }

      // Store in static variable to preserve across component recreation
      ReusableTableComponent.lastCurrentPage = this.currentPage;
      ReusableTableComponent.lastPageSize = this.pageSize;

      if (this.config?.serverSideSearch) {
        this.emitSearchQuery();
      } else {
        this.applyPagination();
      }
    }
  }

  onLastPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage = this.totalPages;

      // Store in static variable to preserve across component recreation
      ReusableTableComponent.lastCurrentPage = this.currentPage;
      ReusableTableComponent.lastPageSize = this.pageSize;

      if (this.config?.serverSideSearch) {
        this.emitSearchQuery();
      } else {
        this.applyPagination();
      }
    }
  }
}
