import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import {
  SetupDepartmentsDialogComponent,
  SetupDepartmentsDialogData,
} from '../setup-departments-dialog/setup-departments-dialog.component';

interface MinistryApiItem {
  id: number;
  ministryName: string;
  numberOfDepartments: number;
  numberOfAssets: number;
  contactName: string | null;
  contactDesignation: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoAvailable: boolean;
}

interface MinistriesSummary {
  totalMinistriesCount: number;
  ministriesMissingContact: number;
  ministriesMissingLogo: number;
}

type MinistryTableFilter = 'all' | 'focal-missing' | 'logo-missing';

@Component({
  selector: 'app-setup-ministries',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule],
  templateUrl: './setup-ministries.component.html',
  styleUrls: ['./setup-ministries.component.scss'],
})
export class SetupMinistriesComponent implements OnInit {
  loading = signal(false);
  error = signal('');
  ministries = signal<MinistryApiItem[]>([]);
  searchTerm = signal('');
  activeFilter = signal<MinistryTableFilter>('all');
  pageNumber = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  hasNextPage = signal(false);
  summary = signal<MinistriesSummary | null>(null);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  searchedMinistries = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    return this.ministries().filter((m) =>
      [m.ministryName, m.contactName ?? '', m.contactEmail ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  });

  filteredMinistries = computed(() => {
    const bySearch = this.searchedMinistries();

    const mode = this.activeFilter();
    if (mode === 'focal-missing') {
      return bySearch.filter((m) => !this.hasFocalPerson(m));
    }
    if (mode === 'logo-missing') {
      return bySearch.filter((m) => !m.logoAvailable);
    }
    return bySearch;
  });

  totalMinistries = computed(() => this.summary()?.totalMinistriesCount ?? this.totalItems());
  focalMissingCount = computed(
    () => this.summary()?.ministriesMissingContact ?? this.searchedMinistries().filter((m) => !this.hasFocalPerson(m)).length,
  );
  logoMissingCount = computed(
    () => this.summary()?.ministriesMissingLogo ?? this.searchedMinistries().filter((m) => !m.logoAvailable).length,
  );

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadMinistries();
  }

  loadMinistries(): void {
    this.loading.set(true);
    this.error.set('');
    let params = new HttpParams()
      .set('PageNumber', String(this.pageNumber()))
      .set('PageSize', String(this.pageSize()))
      .set('SearchTerm', this.searchTerm().trim());

    this.apiService.getMinistries(params).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res?.isSuccessful) {
          this.error.set(res?.message || 'Failed to load ministries');
          this.ministries.set([]);
          this.totalItems.set(0);
          this.summary.set(null);
          this.hasNextPage.set(false);
          return;
        }

        const root = res?.data as any;
        const apiSummary = root?.summary as MinistriesSummary | undefined;
        const data = root?.data ?? root?.items ?? root ?? [];
        const normalized = Array.isArray(data) ? data : [];
        this.ministries.set(normalized);

        const total =
          root?.totalCount ??
          root?.total ??
          root?.totalItems ??
          root?.count ??
          apiSummary?.totalMinistriesCount ??
          normalized.length;
        this.totalItems.set(Number(total) || 0);
        this.summary.set(apiSummary ?? null);
        this.hasNextPage.set(this.pageNumber() * this.pageSize() < (Number(total) || 0));
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error loading ministries. Please try again.');
        this.ministries.set([]);
        this.totalItems.set(0);
        this.summary.set(null);
        this.hasNextPage.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.pageNumber.set(1);
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => this.loadMinistries(), 350);
  }

  hasFocalPerson(m: MinistryApiItem): boolean {
    return !!m.contactName && m.contactName.trim().length > 0;
  }

  setFilter(mode: MinistryTableFilter): void {
    if (this.activeFilter() === mode) return;
    this.activeFilter.set(mode);
    this.pageNumber.set(1);
    this.loadMinistries();
  }

  nextPage(): void {
    if (this.hasNextPage() && !this.loading()) {
      this.pageNumber.update((p) => p + 1);
      this.loadMinistries();
    }
  }

  prevPage(): void {
    if (this.pageNumber() > 1 && !this.loading()) {
      this.pageNumber.update((p) => p - 1);
      this.loadMinistries();
    }
  }

  changePageSize(size: string): void {
    const parsed = Number(size);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    this.pageSize.set(parsed);
    this.pageNumber.set(1);
    this.loadMinistries();
  }

  pageStart(): number {
    if (this.totalItems() === 0) return 0;
    return (this.pageNumber() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    const end = this.pageNumber() * this.pageSize();
    return Math.min(end, this.totalItems());
  }

  openDepartmentsDialog(m: MinistryApiItem): void {
    const payload: SetupDepartmentsDialogData = {
      ministryId: m.id,
      ministryName: m.ministryName,
    };

    const dialogRef = this.dialog.open(SetupDepartmentsDialogComponent, {
      data: payload,
      width: '520px',
      maxWidth: '92vw',
      autoFocus: false,
      panelClass: 'setup-departments-dialog-panel',
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadMinistries();
    });
  }
}


