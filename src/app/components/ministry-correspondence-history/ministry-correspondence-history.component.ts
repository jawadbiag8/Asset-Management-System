import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService, ApiResponse, MinistryCorrespondenceItem } from '../../services/api.service';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { formatDateTime } from '../../utils/date-format.util';

@Component({
  selector: 'app-ministry-correspondence-history',
  templateUrl: './ministry-correspondence-history.component.html',
  styleUrl: './ministry-correspondence-history.component.scss',
  standalone: false,
})
export class MinistryCorrespondenceHistoryComponent implements OnInit, OnDestroy {
  ministryId: number | null = null;
  loading = false;
  errorMessage = '';
  list: MinistryCorrespondenceItem[] = [];
  searchTerm = '';
  pageSize = 10;
  pageIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private breadcrumbService: BreadcrumbService,
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setCurrentLabel('Correspondence History');
    this.applyQueryParams(this.route.snapshot.queryParams);
    this.route.queryParams.subscribe((params) => this.applyQueryParams(params));
  }

  private applyQueryParams(params: Record<string, unknown>): void {
    const id = params['id'] ?? params['ministryId'];
    const nextId = id != null ? +id : null;
    if (nextId === this.ministryId) return;
    this.ministryId = nextId;
    if (this.ministryId != null) {
      this.errorMessage = '';
      this.loadCorrespondence();
    } else {
      this.list = [];
      this.errorMessage = 'Ministry ID is required.';
    }
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setCurrentLabel(null);
  }

  loadCorrespondence(): void {
    if (this.ministryId == null) return;
    this.loading = true;
    this.errorMessage = '';
    this.apiService.getMinistryCorrespondence(this.ministryId).subscribe({
      next: (res: ApiResponse<MinistryCorrespondenceItem[]>) => {
        this.loading = false;
        if (res.isSuccessful && Array.isArray(res.data)) {
          this.list = res.data;
        } else {
          this.list = [];
        }
      },
      error: () => {
        this.loading = false;
        this.list = [];
        this.errorMessage = 'Failed to load correspondence.';
      },
    });
  }

  get filteredList(): MinistryCorrespondenceItem[] {
    const term = (this.searchTerm || '').toLowerCase().trim();
    if (!term) return this.list;
    return this.list.filter(
      (item) =>
        (item.ministryName || '').toLowerCase().includes(term) ||
        (item.refId || '').toLowerCase().includes(term) ||
        (item.status || '').toLowerCase().includes(term),
    );
  }

  get paginatedList(): MinistryCorrespondenceItem[] {
    const all = this.filteredList;
    const start = this.pageIndex * this.pageSize;
    return all.slice(start, start + this.pageSize);
  }

  get totalFiltered(): number {
    return this.filteredList.length;
  }

  get paginationStart(): number {
    const total = this.totalFiltered;
    if (total === 0) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get paginationEnd(): number {
    const total = this.totalFiltered;
    const end = (this.pageIndex + 1) * this.pageSize;
    return Math.min(end, total);
  }

  get totalPages(): number {
    const total = this.totalFiltered;
    if (total <= 0) return 1;
    return Math.ceil(total / this.pageSize);
  }

  formatDate(dateStr: string | null | undefined): string {
    return formatDateTime(dateStr);
  }

  getStatusPillClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'dispatched') return 'status-dispatched';
    if (s === 'draft') return 'status-draft';
    return 'status-other';
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.pageIndex = 0;
  }

  onPageChange(newIndex: number): void {
    this.pageIndex = Math.max(0, newIndex);
  }
}
