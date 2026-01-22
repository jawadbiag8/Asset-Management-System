import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

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
  linkField?: string; // Field name for URL
  linkPrefix?: string; // URL prefix (e.g., 'https://')
  
  // For 'text-with-color' cells
  textColor?: string; // Color class name (e.g., 'success', 'success-light')
}

export interface FilterPill {
  id: string;
  label: string;
  value: string;
  type: 'selected' | 'dropdown';
  removable?: boolean;
}

export interface TableConfig {
  columns: TableColumn[]; // Array of column definitions
  data: any[]; // Array of data objects
  minWidth?: string; // Minimum table width (default: '1400px')
  // Search configuration
  searchPlaceholder?: string; // Placeholder text for search input
  // Filter configuration
  filters?: FilterPill[]; // Array of filter pills to display
}

@Component({
  selector: 'app-reusable-table',
  templateUrl: './reusable-table.component.html',
  styleUrl: './reusable-table.component.scss',
  standalone: false,
})
export class ReusableTableComponent implements OnInit {
  @Input() config!: TableConfig;
  @Input() searchValue: string = ''; // Search value controlled from parent
  @Input() filters: FilterPill[] = []; // Filters controlled from parent
  
  @Output() searchChange = new EventEmitter<string>(); // Emit search value changes
  @Output() filterRemove = new EventEmitter<string>(); // Emit when filter is removed
  @Output() filterClick = new EventEmitter<string>(); // Emit when filter is clicked
  
  displayedColumns: string[] = [];
  sortState: { [key: string]: 'asc' | 'desc' | null } = {};

  ngOnInit() {
    if (this.config && this.config.columns) {
      this.displayedColumns = this.config.columns.map(col => col.key);
    }
    // Initialize filters from config if provided
    if (this.config?.filters && this.filters.length === 0) {
      this.filters = this.config.filters;
    }
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }

  onFilterRemove(filterId: string) {
    this.filterRemove.emit(filterId);
  }

  onFilterClick(filterId: string) {
    this.filterClick.emit(filterId);
  }

  onSort(columnKey: string) {
    const currentSort = this.sortState[columnKey];
    if (currentSort === 'asc') {
      this.sortState[columnKey] = 'desc';
    } else if (currentSort === 'desc') {
      this.sortState[columnKey] = null;
    } else {
      this.sortState[columnKey] = 'asc';
    }
    // Reset other columns
    Object.keys(this.sortState).forEach(key => {
      if (key !== columnKey) {
        this.sortState[key] = null;
      }
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
