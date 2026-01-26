import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { HttpParams } from '@angular/common/http';

/**
 * Reusable Table Component
 * 
 * A flexible, reusable table component that supports multiple cell types and configurations.
 * 
 * Usage Example:
 * ```typescript
 * tableConfig: TableConfig = {
 *   minWidth: '1400px',
 *   columns: [
 *     {
 *       key: 'name',
 *       header: 'NAME',
 *       cellType: 'text',
 *       primaryField: 'name',
 *       sortable: true
 *     },
 *     {
 *       key: 'status',
 *       header: 'STATUS',
 *       cellType: 'badge',
 *       badgeField: 'status',
 *       badgeColor: 'var(--color-green-light)',
 *       badgeTextColor: 'var(--color-green-dark)',
 *       sortable: true
 *     }
 *   ],
 *   data: [...]
 * };
 * ```
 */

export type CellType = 'text' | 'two-line' | 'badge' | 'icon' | 'link' | 'badge-with-subtext' | 'text-with-color';

export interface TableColumn {
  key: string; // Unique identifier for the column
  header: string; // Column header text
  cellType: CellType; // Type of cell rendering
  sortable?: boolean; // Whether column is sortable (default: true)
  width?: string; // Optional column width
  
  // For 'text' and 'two-line' cells
  primaryField?: string; // Field name for primary text
  secondaryField?: string; // Field name for secondary text (two-line only)
  
  // For 'badge' and 'badge-with-subtext' cells
  badgeField?: string; // Field name for badge text
  badgeColor?: string; // Background color (CSS variable or hex)
  badgeTextColor?: string; // Text color (CSS variable or hex)
  subtextField?: string; // Field name for subtext (badge-with-subtext only)
  
  // For 'icon' cells
  iconName?: string; // Material icon name
  iconColor?: string; // Icon color (CSS variable or hex)
  iconBgColor?: string; // Icon background color (CSS variable or hex)
  
  // For 'link' cells
  linkField?: string; // Field name for full URL
  
  // For 'text-with-color' cells
  textColor?: string; // Color class name (e.g., 'success', 'success-light')
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
}

@Component({
  selector: 'app-reusable-table',
  templateUrl: './reusable-table.component.html',
  styleUrl: './reusable-table.component.scss',
  standalone: false,
})
export class ReusableTableComponent implements OnInit, OnChanges {
  @Input() config!: TableConfig;
  @Input() searchValue: string = ''; // Search value controlled from parent
  @Input() filters: FilterPill[] = []; // Filters controlled from parent
  
  @Output() searchChange = new EventEmitter<string>(); // Emit search value changes (for client-side)
  @Output() searchQuery = new EventEmitter<HttpParams>(); // Emit search query parameter as HttpParams (for server-side)
  @Output() filterRemove = new EventEmitter<string>(); // Emit when filter is removed
  @Output() filterClick = new EventEmitter<FilterPill>(); // Emit when filter is clicked with filter object
  @Output() filterApply = new EventEmitter<{ filterId: string; selectedValues: string[] }[]>(); // Emit when filters are applied (all at once)
  
  displayedColumns: string[] = [];
  sortState: { [key: string]: 'asc' | 'desc' | null } = {};
  sortedData: any[] = [];
  filteredData: any[] = [];
  private originalData: any[] = [];
  
  // Filter modal state
  isFilterModalOpen = false;

  ngOnInit() {
    if (this.config && this.config.columns) {
      this.displayedColumns = this.config.columns.map(col => col.key);
    }
    // Initialize filters from config if provided
    if (this.config?.filters && this.filters.length === 0) {
      this.filters = this.config.filters;
    }
    // Initialize data - ensure it's an array
    const data = this.config?.data;
    this.originalData = Array.isArray(data) ? [...data] : [];
    this.sortedData = [...this.originalData];
    
    // For server-side search, emit initial query with page and pageSize
    if (this.config?.serverSideSearch) {
      this.emitSearchQuery();
    } else {
      // For client-side search, apply search immediately
      this.applySearch();
    }
  }


  ngOnChanges(changes: SimpleChanges) {
    // Update data when config changes
    if (changes['config'] && this.config?.data && Array.isArray(this.config.data)) {
      this.originalData = [...this.config.data];
      this.sortedData = [...this.originalData];
      // Reapply search only if client-side
      if (!this.config?.serverSideSearch) {
        this.applySearch();
        // Reapply current sort if any
        const activeSort = Object.keys(this.sortState).find(key => this.sortState[key] !== null);
        if (activeSort) {
          this.applySort(activeSort, this.sortState[activeSort]!);
        }
      }
    } else if (changes['config'] && (!this.config?.data || !Array.isArray(this.config.data))) {
      // If data is not an array, set empty arrays
      this.originalData = [];
      this.sortedData = [];
      this.filteredData = [];
    }
    
    // Update when search value changes
    if (changes['searchValue']) {
      // For server-side search, don't trigger search automatically - only on button click
      // For client-side search, apply search immediately
      if (!this.config?.serverSideSearch) {
        this.applySearch();
        // Reapply current sort if any
        const activeSort = Object.keys(this.sortState).find(key => this.sortState[key] !== null);
        if (activeSort) {
          this.applySort(activeSort, this.sortState[activeSort]!);
        }
      }
    }
    
    // When filters change and server-side search is enabled, emit query with updated filters
    if (changes['filters'] && this.config?.serverSideSearch && !changes['filters'].firstChange) {
      // Use setTimeout to ensure filters are fully updated in parent component
      setTimeout(() => {
        this.emitSearchQuery();
      }, 0);
    }
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    // Emit value change for parent component state management
    this.searchChange.emit(value);
    
    // For client-side search, apply immediately
    // For server-side search, don't trigger search - only on button click
    if (!this.config?.serverSideSearch) {
      this.applySearch();
      // Reapply current sort if any
      const activeSort = Object.keys(this.sortState).find(key => this.sortState[key] !== null);
      if (activeSort) {
        this.applySort(activeSort, this.sortState[activeSort]!);
      }
    }
  }

  onSearchButtonClick() {
    if (this.config?.serverSideSearch) {
      // For server-side search, emit query with params
      this.emitSearchQuery();
    } else {
      // Client-side search - apply search
      this.applySearch();
      // Reapply current sort if any
      const activeSort = Object.keys(this.sortState).find(key => this.sortState[key] !== null);
      if (activeSort) {
        this.applySort(activeSort, this.sortState[activeSort]!);
      }
    }
  }

  private emitSearchQuery() {
    // Build HttpParams with page, pageSize, search, and filters
    const page = this.config?.defaultPage || 1;
    const pageSize = this.config?.defaultPageSize || 10;
    const searchValue = this.searchValue?.trim() || '';
    
    let httpParams = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (searchValue) {
      httpParams = httpParams.set('search', searchValue);
    }
    
    // Add filter parameters
    this.filters.forEach(filter => {
      if (filter.paramKey && filter.value && filter.value !== 'All') {
        httpParams = httpParams.set(filter.paramKey, filter.value);
      }
    });
    
    this.searchQuery.emit(httpParams);
  }

  private applySearch() {
    if (!this.searchValue || this.searchValue.trim() === '') {
      this.sortedData = [...this.originalData];
      this.filteredData = [...this.originalData];
      return;
    }

    const searchTerm = this.searchValue.toLowerCase().trim();
    this.filteredData = this.originalData.filter(row => {
      // Search across all columns
      return this.config.columns.some(column => {
        let cellValue: any = '';
        
        // Get cell value based on column type
        if (column.cellType === 'text' || column.cellType === 'two-line' || column.cellType === 'text-with-color') {
          const primary = this.getNestedValue(row, column.primaryField || column.key);
          const secondary = this.getNestedValue(row, column.secondaryField || '');
          cellValue = `${primary || ''} ${secondary || ''}`.trim();
        } else if (column.cellType === 'badge' || column.cellType === 'badge-with-subtext') {
          const badge = this.getNestedValue(row, column.badgeField || column.key);
          const subtext = this.getNestedValue(row, column.subtextField || '');
          cellValue = `${badge || ''} ${subtext || ''}`.trim();
        } else if (column.cellType === 'link') {
          const primary = this.getNestedValue(row, column.primaryField || '');
          const link = this.getNestedValue(row, column.linkField || '');
          cellValue = `${primary || ''} ${link || ''}`.trim();
        } else {
          cellValue = this.getNestedValue(row, column.primaryField || column.key);
        }

        // Convert to string and search
        const valueStr = String(cellValue || '').toLowerCase();
        return valueStr.includes(searchTerm);
      });
    });

    // Update sorted data with filtered data
    this.sortedData = [...this.filteredData];
  }

  onFilterRemove(filterId: string) {
    this.filterRemove.emit(filterId);
    // Don't emit here - let parent update filters first, then filters change will trigger emitSearchQuery via ngOnChanges
  }

  onFilterClick(filter: FilterPill) {
    // Open modal with all filters
    this.isFilterModalOpen = true;
    this.filterClick.emit(filter);
  }

  onFilterApply(filterChanges: { filterId: string; selectedValues: string[] }[]) {
    // Emit all filter changes at once
    this.filterApply.emit(filterChanges);
    this.isFilterModalOpen = false;
    // Don't emit here - let parent update filters first, then parent will trigger API call
  }

  onFilterModalClose() {
    this.isFilterModalOpen = false;
  }

  onFilterReset() {
    // Reset all filters to "All"
    const resetChanges = this.filters.map(filter => ({
      filterId: filter.id,
      selectedValues: ['All']
    }));
    this.filterApply.emit(resetChanges);
    this.isFilterModalOpen = false;
    // Don't emit here - let parent update filters first, then parent will trigger API call
  }

  onSort(columnKey: string) {
    const column = this.config.columns.find(col => col.key === columnKey);
    if (!column || column.sortable === false) return;

    const currentSort = this.sortState[columnKey];
    let newSort: 'asc' | 'desc' | null;
    
    if (currentSort === 'asc') {
      newSort = 'desc';
    } else if (currentSort === 'desc') {
      newSort = null;
    } else {
      newSort = 'asc';
    }

    // Reset other columns
    Object.keys(this.sortState).forEach(key => {
      if (key !== columnKey) {
        this.sortState[key] = null;
      }
    });

    this.sortState[columnKey] = newSort;

    // Apply sorting
    if (newSort) {
      this.applySort(columnKey, newSort);
    } else {
      // Reset to filtered data order (or original if no search)
      this.sortedData = this.searchValue && this.searchValue.trim() 
        ? [...this.filteredData] 
        : [...this.originalData];
    }
  }

  private applySort(columnKey: string, direction: 'asc' | 'desc') {
    const column = this.config.columns.find(col => col.key === columnKey);
    if (!column) return;

    // Determine which field to sort by
    let sortField: string;
    if (column.cellType === 'text' || column.cellType === 'two-line' || column.cellType === 'text-with-color') {
      sortField = column.primaryField || column.key;
    } else if (column.cellType === 'badge' || column.cellType === 'badge-with-subtext') {
      sortField = column.badgeField || column.key;
    } else if (column.cellType === 'link') {
      sortField = column.linkField || column.primaryField || column.key;
    } else {
      sortField = column.key;
    }

    // Use filtered data if search is active, otherwise use original data
    const dataToSort = this.searchValue && this.searchValue.trim() 
      ? [...this.filteredData] 
      : [...this.originalData];

    // Sort the data
    this.sortedData = dataToSort.sort((a, b) => {
      const aValue = this.getNestedValue(a, sortField);
      const bValue = this.getNestedValue(b, sortField);

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === 'asc' ? -1 : 1;
      if (bValue == null) return direction === 'asc' ? 1 : -1;

      // Convert to comparable values
      let aCompare: any = aValue;
      let bCompare: any = bValue;

      // Handle numbers (including percentages)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aNum = parseFloat(aValue.replace('%', '').replace(',', ''));
        const bNum = parseFloat(bValue.replace('%', '').replace(',', ''));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          aCompare = aNum;
          bCompare = bNum;
        } else {
          // String comparison
          aCompare = aValue.toLowerCase();
          bCompare = bValue.toLowerCase();
        }
      }

      // Compare values
      if (aCompare < bCompare) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aCompare > bCompare) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
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

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  getBadgeClass(badgeColor?: string): string {
    if (!badgeColor) return 'badge-success';
    return `badge-${badgeColor}`;
  }

  getTextColorClass(textColor?: string): string {
    if (!textColor) return '';
    return `text-${textColor}`;
  }

  getSecondaryTextColorClass(textColor?: string): string {
    if (!textColor) return '';
    // For secondary text, append '-light' if it's a success color
    if (textColor === 'success') {
      return 'text-success-light';
    }
    return `text-${textColor}`;
  }
}
