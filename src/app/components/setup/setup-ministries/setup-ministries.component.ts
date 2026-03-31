import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { UtilsService } from '../../../services/utils.service';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from '../../reusable/confirmation-dialog/confirmation-dialog.component';
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
  /** When false, delete is blocked (linked assets/departments). */
  canDelete?: boolean;
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
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatDialogModule,
    MatMenuModule,
    MatButtonModule,
    RouterModule,
  ],
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
    // Filtering is applied server-side via query params for card clicks.
    // Keep local search behavior for instant typing feedback.
    return this.searchedMinistries();
  });

  totalMinistries = computed(() => this.summary()?.totalMinistriesCount ?? this.totalItems());
  focalMissingCount = computed(
    () => this.summary()?.ministriesMissingContact ?? this.searchedMinistries().filter((m) => !this.hasFocalPerson(m)).length,
  );
  logoMissingCount = computed(
    () => this.summary()?.ministriesMissingLogo ?? this.searchedMinistries().filter((m) => !m.logoAvailable).length,
  );
  totalItemsForView = computed(() => this.totalItems());
  hasNextPageForView = computed(
    () => this.pageNumber() * this.pageSize() < this.totalItemsForView(),
  );

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private utils: UtilsService,
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
    const mode = this.activeFilter();
    if (mode === 'logo-missing') {
      params = params.set('LogoAvailable', 'false');
    } else if (mode === 'focal-missing') {
      params = params.set('HasContactEmail', 'false');
    }

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
        const list = Array.isArray(data) ? data : [];
        this.ministries.set(list.map((item: any) => this.normalizeMinistryItem(item)));

        const total =
          root?.totalCount ??
          root?.total ??
          root?.totalItems ??
          root?.count ??
          apiSummary?.totalMinistriesCount ??
          list.length;
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
    if (this.hasNextPageForView() && !this.loading()) {
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
    if (this.totalItemsForView() === 0) return 0;
    return (this.pageNumber() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    const end = this.pageNumber() * this.pageSize();
    return Math.min(end, this.totalItemsForView());
  }

  private parseCanDelete(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const s = value.trim().toLowerCase();
      if (s === 'false' || s === '0') return false;
      if (s === 'true' || s === '1') return true;
      return true;
    }
    if (typeof value === 'number') return value !== 0;
    return Boolean(value);
  }

  private normalizeMinistryItem(item: any): MinistryApiItem {
    const canDeleteRaw = item?.canDelete ?? item?.CanDelete;
    return {
      id: item.id ?? item.Id,
      ministryName: item.ministryName ?? item.MinistryName ?? '',
      numberOfDepartments: item.numberOfDepartments ?? item.NumberOfDepartments ?? 0,
      numberOfAssets: item.numberOfAssets ?? item.NumberOfAssets ?? 0,
      contactName: item.contactName ?? item.ContactName ?? null,
      contactDesignation: item.contactDesignation ?? item.ContactDesignation ?? null,
      contactEmail: item.contactEmail ?? item.ContactEmail ?? null,
      contactPhone: item.contactPhone ?? item.ContactPhone ?? null,
      logoAvailable: item.logoAvailable ?? item.LogoAvailable ?? false,
      canDelete: this.parseCanDelete(canDeleteRaw),
    };
  }

  onDeleteMinistry(m: MinistryApiItem, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (m.canDelete === false) {
      this.utils.showToast(
        'You cannot delete this ministry because some assets or departments are linked with it.',
        'Cannot delete',
        'warning',
      );
      return;
    }
    const data: ConfirmationDialogData = {
      title: 'Delete ministry',
      message: `Are you sure you want to delete "${m.ministryName}"? This action cannot be undone.`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };
    this.dialog
      .open(ConfirmationDialogComponent, {
        width: '400px',
        data,
        disableClose: true,
        panelClass: 'app-confirmation-dialog-dark',
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.loading.set(true);
        this.apiService.deleteMinistry(m.id).subscribe({
          next: (res) => {
            this.loading.set(false);
            if (!res?.isSuccessful) {
              this.utils.showToast(res?.message ?? 'Failed to delete ministry.', 'Delete', 'error');
              return;
            }
            this.utils.showToast(res?.message ?? 'Ministry deleted.', 'Delete', 'success');
            this.loadMinistries();
          },
          error: () => {
            this.loading.set(false);
            this.utils.showToast('Error deleting ministry. Please try again.', 'Delete', 'error');
          },
        });
      });
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


