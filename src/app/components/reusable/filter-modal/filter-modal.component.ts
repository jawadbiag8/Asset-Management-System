import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FilterPill, FilterOption } from '../reusable-table/reusable-table.component';

@Component({
  selector: 'app-filter-modal',
  templateUrl: './filter-modal.component.html',
  styleUrl: './filter-modal.component.scss',
  standalone: false,
})
export class FilterModalComponent implements OnChanges, OnDestroy {
  @Input() filters: FilterPill[] = [];
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() apply = new EventEmitter<{ filterId: string; selectedValues: string[] }[]>();
  @Output() reset = new EventEmitter<void>();

  selectedValues: Map<string, string> = new Map();
  filterControls: Map<string, FormControl> = new Map();
  filteredOptions: Map<string, ReplaySubject<FilterOption[]>> = new Map();
  selectControls: Map<string, FormControl> = new Map();
  filterSubscriptions: Map<string, Subject<void>> = new Map();
  protected _onDestroy = new Subject<void>();

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['filters'] || changes['isOpen']) && this.filters && this.isOpen) {
      // Initialize with current values for all filters
      this.selectedValues.clear();
      this.filters.forEach(filter => {
        // Use filter.value if it exists, otherwise use empty string (which corresponds to "All")
        const defaultValue = filter.value || '';
        this.selectedValues.set(filter.id, defaultValue);

        // Initialize FormControls for search and select
        if (!this.filterControls.has(filter.id)) {
          this.filterControls.set(filter.id, new FormControl());
        } else {
          // Reset search control when modal opens
          this.filterControls.get(filter.id)?.setValue('', { emitEvent: false });
        }

        if (!this.selectControls.has(filter.id)) {
          const selectControl = new FormControl(defaultValue);
          this.selectControls.set(filter.id, selectControl);
        } else {
          // Update select control with current value
          this.selectControls.get(filter.id)?.setValue(defaultValue, { emitEvent: false });
        }

        if (!this.filteredOptions.has(filter.id)) {
          this.filteredOptions.set(filter.id, new ReplaySubject<FilterOption[]>(1));
        }

        // Initialize filtered options with all options
        if (filter.options) {
          const filteredOptions = this.filteredOptions.get(filter.id);
          if (filteredOptions) {
            filteredOptions.next(filter.options.slice());
          }
        }

        // Setup filtering for this filter
        this.setupFiltering(filter.id);
      });
    }
  }

  ngOnDestroy() {
    // Clean up all filter subscriptions
    this.filterSubscriptions.forEach(subject => {
      subject.next();
      subject.complete();
    });
    this.filterSubscriptions.clear();
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  setupFiltering(filterId: string) {
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter || !filter.options) return;

    const filterControl = this.filterControls.get(filterId);
    const filteredOptions = this.filteredOptions.get(filterId);

    if (!filterControl || !filteredOptions) return;

    // Unsubscribe from previous subscription if exists
    const existingSubscription = this.filterSubscriptions.get(filterId);
    if (existingSubscription) {
      existingSubscription.next();
      existingSubscription.complete();
    }

    // Create new subscription subject
    const subscriptionSubject = new Subject<void>();
    this.filterSubscriptions.set(filterId, subscriptionSubject);

    // Load initial options
    filteredOptions.next(filter.options.slice());

    // Listen for search field value changes
    filterControl.valueChanges
      .pipe(takeUntil(subscriptionSubject))
      .subscribe(() => {
        this.filterOptions(filterId);
      });
  }

  filterOptions(filterId: string) {
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter || !filter.options) return;

    const filterControl = this.filterControls.get(filterId);
    const filteredOptions = this.filteredOptions.get(filterId);

    if (!filterControl || !filteredOptions) return;

    // Get the search keyword
    let search = filterControl.value;
    if (!search) {
      filteredOptions.next(filter.options.slice());
      return;
    } else {
      search = search.toLowerCase();
    }

    // Filter the options
    filteredOptions.next(
      filter.options.filter(option => 
        option.label.toLowerCase().indexOf(search) > -1
      )
    );
  }

  getFilterControl(filterId: string): FormControl {
    if (!this.filterControls.has(filterId)) {
      this.filterControls.set(filterId, new FormControl());
    }
    return this.filterControls.get(filterId)!;
  }

  getSelectControl(filterId: string): FormControl {
    if (!this.selectControls.has(filterId)) {
      const defaultValue = this.selectedValues.get(filterId) || '';
      this.selectControls.set(filterId, new FormControl(defaultValue));
    }
    return this.selectControls.get(filterId)!;
  }

  getFilteredOptions(filterId: string): ReplaySubject<FilterOption[]> {
    if (!this.filteredOptions.has(filterId)) {
      this.filteredOptions.set(filterId, new ReplaySubject<FilterOption[]>(1));
    }
    return this.filteredOptions.get(filterId)!;
  }

  onSelectChange(filterId: string, value: string) {
    this.selectedValues.set(filterId, value);
    this.selectControls.get(filterId)?.setValue(value);
  }

  onApply() {
    // Emit all filter changes
    const filterChanges: { filterId: string; selectedValues: string[] }[] = [];
    this.filters.forEach(filter => {
      // Get value from select control (source of truth)
      const selectControl = this.selectControls.get(filter.id);
      const selectedValue = selectControl?.value || '';
      this.selectedValues.set(filter.id, selectedValue);
      filterChanges.push({
        filterId: filter.id,
        selectedValues: [selectedValue],
      });
    });
    this.apply.emit(filterChanges);
    this.close.emit();
  }

  onReset() {
    // Reset all filters to empty string (which corresponds to "All")
    this.filters.forEach(filter => {
      this.selectedValues.set(filter.id, '');
      this.selectControls.get(filter.id)?.setValue('');
      this.filterControls.get(filter.id)?.setValue('');
      // Reset filtered options to show all
      const filteredOptions = this.filteredOptions.get(filter.id);
      if (filteredOptions && filter.options) {
        filteredOptions.next(filter.options.slice());
      }
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
