import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FilterPill, FilterOption } from '../reusable-table/reusable-table.component';

@Component({
  selector: 'app-filter-modal',
  templateUrl: './filter-modal.component.html',
  styleUrl: './filter-modal.component.scss',
  standalone: false,
})
export class FilterModalComponent implements OnChanges {
  @Input() filters: FilterPill[] = [];
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() apply = new EventEmitter<{ filterId: string; selectedValues: string[] }[]>();
  @Output() reset = new EventEmitter<void>();

  selectedValues: Map<string, string> = new Map();

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['filters'] || changes['isOpen']) && this.filters && this.isOpen) {
      // Initialize with current values for all filters
      this.selectedValues.clear();
      this.filters.forEach(filter => {
        this.selectedValues.set(filter.id, filter.value || 'All');
      });
    }
  }

  selectOption(filterId: string, optionValue: string) {
    // Single selection - directly set the value for this filter
    this.selectedValues.set(filterId, optionValue);
  }

  isSelected(filterId: string, optionValue: string): boolean {
    return this.selectedValues.get(filterId) === optionValue;
  }

  onApply() {
    // Emit all filter changes
    const filterChanges: { filterId: string; selectedValues: string[] }[] = [];
    this.filters.forEach(filter => {
      const selectedValue = this.selectedValues.get(filter.id) || 'All';
      filterChanges.push({
        filterId: filter.id,
        selectedValues: [selectedValue],
      });
    });
    this.apply.emit(filterChanges);
    this.close.emit();
  }

  onReset() {
    // Reset all filters to "All"
    this.filters.forEach(filter => {
      this.selectedValues.set(filter.id, 'All');
    });
    this.reset.emit();
    this.close.emit();
  }

  onClose() {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }
}
