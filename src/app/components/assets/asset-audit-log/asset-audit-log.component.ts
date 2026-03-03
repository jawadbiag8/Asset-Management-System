import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService, ApiResponse, AssetHistoryItem } from '../../../services/api.service';
import { UtilsService } from '../../../services/utils.service';
import { BreadcrumbService } from '../../../services/breadcrumb.service';

export interface ChangeItem {
  label: string;
  value: string;
}

export interface AuditLogEntry {
  id: string;
  dateTime: string;
  editedBy: string;
  referenceNumber: string;
  /** Optional path for Ref. Document download */
  documentPath?: string;
  /** All changes in this iteration – shown under accordion */
  changesList: ChangeItem[];
}

@Component({
  selector: 'app-asset-audit-log',
  templateUrl: './asset-audit-log.component.html',
  styleUrl: './asset-audit-log.component.scss',
  standalone: false,
})
export class AssetAuditLogComponent implements OnInit, OnDestroy {
  searchTerm = signal<string>('');
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  /** Set of log entry ids that are expanded (accordion open) */
  expandedIds = signal<Set<string>>(new Set<string>());

  private readonly allLogs = signal<AuditLogEntry[]>([]);

  /** Filtered list by search (date, editedBy, referenceNumber, or any change label/value) */
  filteredLogs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const logs = this.allLogs();
    if (!term) return logs;
    return logs.filter((log) => {
      const matchMeta =
        log.dateTime.toLowerCase().includes(term) ||
        log.editedBy.toLowerCase().includes(term) ||
        log.referenceNumber.toLowerCase().includes(term);
      if (matchMeta) return true;
      return log.changesList.some(
        (c) =>
          c.label.toLowerCase().includes(term) || c.value.toLowerCase().includes(term)
      );
    });
  });

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private utils: UtilsService,
    private breadcrumbService: BreadcrumbService,
  ) {}

  ngOnInit(): void {
    const assetId = this.route.snapshot.queryParams['assetId'];
    const id = assetId != null ? Number(assetId) : NaN;
    if (!id || isNaN(id)) {
      this.errorMessage.set('Asset ID is required. Open audit log from Edit Digital Asset.');
      return;
    }
    this.loadHistory(id);
    this.loadAssetNameForBreadcrumb(id);
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setCurrentLabel(null);
  }

  private loadAssetNameForBreadcrumb(assetId: number): void {
    this.api.getAssetById(assetId).subscribe({
      next: (res: ApiResponse<any>) => {
        const name = res?.data?.assetName ?? res?.data?.name ?? '';
        const label = name ? `${name} - Audit Logs` : 'Audit Logs';
        this.breadcrumbService.setCurrentLabel(label);
      },
      error: () => {
        this.breadcrumbService.setCurrentLabel('Audit Logs');
      },
    });
  }

  loadHistory(assetId: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.api.getAssetHistory(assetId).subscribe({
      next: (res: ApiResponse<AssetHistoryItem[]>) => {
        this.loading.set(false);
        if (res.isSuccessful && Array.isArray(res.data)) {
          const entries = res.data.map((item) => this.mapHistoryItemToEntry(item));
          this.allLogs.set(entries);
          if (entries.length > 0) {
            this.expandedIds.set(new Set([entries[0].id]));
          }
        } else {
          this.errorMessage.set(res.message ?? 'Failed to load asset history.');
          this.allLogs.set([]);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = this.utils.showToast(err, 'Error loading asset history.', 'error', true);
        this.errorMessage.set(typeof msg === 'string' ? msg : 'Error loading asset history.');
        this.allLogs.set([]);
      },
    });
  }

  private mapHistoryItemToEntry(item: AssetHistoryItem): AuditLogEntry {
    const changes = item.changes ?? {};
    const changesList: ChangeItem[] = Object.entries(changes).map(([key, val]) => ({
      label: this.formatChangeLabel(key),
      value: val == null ? '—' : String(val).trim() || '—',
    }));
    return {
      id: String(item.id),
      dateTime: this.formatDateTime(item.createdAt),
      editedBy: item.userName || item.createdBy || '—',
      referenceNumber: item.refId || '—',
      documentPath: item.path || undefined,
      changesList,
    };
  }

  /** Turn API key into readable label (e.g. AssetName -> "Asset Name", StatusId -> "Status") */
  private formatChangeLabel(key: string): string {
    const labels: Record<string, string> = {
      AssetName: 'Asset Name',
      AssetUrl: 'Asset URL',
      CitizenImpactLevel: 'Citizen Impact Level',
      Status: 'Status',
      StatusId: 'Status',
      Description: 'Description',
      DepartmentId: 'Department',
    };
    if (labels[key]) return labels[key];
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
  }

  private formatDateTime(iso: string): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${day}/${month}/${year} ${h12}:${minutes} ${ampm}`;
    } catch {
      return iso;
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  toggleAccordion(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const current = new Set(this.expandedIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.expandedIds.set(current);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onRefDocument(log: AuditLogEntry, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!log.documentPath) {
      this.utils.showToast('No reference document available.', 'Ref. Document', 'info');
      return;
    }
    const historyId = Number(log.id);
    if (isNaN(historyId)) {
      this.utils.showToast('Invalid history entry.', 'Ref. Document', 'error');
      return;
    }
    this.api.downloadAssetHistoryDocument(historyId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = log.referenceNumber ? `ref-${log.referenceNumber}.pdf` : 'reference-document.pdf';
        a.click();
        URL.revokeObjectURL(url);
        this.utils.showToast('Document downloaded.', 'Ref. Document', 'success');
      },
      error: (err) => {
        this.utils.showToast(err, 'Failed to download document.', 'error');
      },
    });
  }
}
