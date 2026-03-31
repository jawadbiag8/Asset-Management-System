import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService, ApiResponse, MinistryHistoryItem } from '../../../services/api.service';
import { UtilsService } from '../../../services/utils.service';

/** True when API path indicates no attachment (download must stay disabled). */
export function isMinistryHistoryPathNoAttachment(path: string | null | undefined): boolean {
  if (path == null || String(path).trim() === '') return true;
  const p = String(path).replace(/\\/g, '/').toLowerCase();
  return p.includes('ministryhistory/references/no_attachment_available');
}

export interface MinistryHistoryViewRow {
  id: string;
  dateTime: string;
  editedBy: string;
  refId: string;
  path: string;
  changeRows: { label: string; value: string }[];
  downloadDisabled: boolean;
}

@Component({
  selector: 'app-setup-ministry-history',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './setup-ministry-history.component.html',
  styleUrl: './setup-ministry-history.component.scss',
})
export class SetupMinistryHistoryComponent implements OnInit {
  /** Readable labels for API field names (camel / Pascal). */
  private readonly fieldLabels: Record<string, string> = {
    MinistryName: 'Ministry Name',
    ministryName: 'Ministry Name',
    Logo: 'Logo',
    logo: 'Logo',
    Address: 'Address',
    address: 'Address',
    ContactName: 'Contact Name',
    contactName: 'Contact Name',
    ContactEmail: 'Contact Email',
    contactEmail: 'Contact Email',
    ContactPhone: 'Contact Phone',
    contactPhone: 'Contact Phone',
    ContactDesignation: 'Contact Designation',
    contactDesignation: 'Contact Designation',
    Description: 'Description',
    description: 'Description',
    RefId: 'Reference ID',
    refId: 'Reference ID',
    eventType: 'Event',
    EventType: 'Event',
    departmentId: 'Department ID',
    DepartmentId: 'Department ID',
  };

  loading = signal(false);
  error = signal('');
  ministryId = signal<number | null>(null);
  ministryName = signal('');
  searchTerm = signal('');
  expandedIds = signal<Set<string>>(new Set());
  private readonly rawItems = signal<MinistryHistoryViewRow[]>([]);

  filteredItems = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const list = this.rawItems();
    if (!q) return list;
    return list.filter((row) => {
      const blob = [row.dateTime, row.editedBy, row.refId, row.path, ...row.changeRows.flatMap((c) => [c.label, c.value])]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  });

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private utils: UtilsService,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id) || id <= 0) {
      this.error.set('Invalid ministry.');
      return;
    }
    this.ministryId.set(id);
    this.loadMinistryName(id);
    this.loadHistory(id);
  }

  private loadMinistryName(id: number): void {
    this.api.getMinistryById(id).subscribe({
      next: (res: ApiResponse<any>) => {
        const data = res?.data?.data ?? res?.data ?? {};
        const name = data?.ministryName ?? data?.MinistryName ?? '';
        this.ministryName.set(typeof name === 'string' ? name : '');
      },
      error: () => {
        this.ministryName.set('');
      },
    });
  }

  private loadHistory(ministryId: number): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getMinistryHistory(ministryId).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res?.isSuccessful || !Array.isArray(res.data)) {
          this.error.set(res?.message ?? 'Failed to load ministry history.');
          this.rawItems.set([]);
          return;
        }
        const mapped = res.data.map((item) => this.mapItem(item));
        this.rawItems.set(mapped);
        if (mapped.length > 0) {
          this.expandedIds.set(new Set([mapped[0].id]));
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error loading ministry history.');
        this.rawItems.set([]);
      },
    });
  }

  private mapItem(item: MinistryHistoryItem): MinistryHistoryViewRow {
    const ch = (item.changes ?? {}) as Record<string, unknown>;
    return {
      id: String(item.id),
      dateTime: this.formatDateTime(item.createdAt),
      editedBy: item.userName || item.createdBy || '—',
      refId: item.refId || '—',
      path: item.path || '',
      changeRows: this.formatMinistryChanges(ch),
      downloadDisabled: isMinistryHistoryPathNoAttachment(item.path),
    };
  }

  private formatMinistryChanges(ch: Record<string, unknown>): { label: string; value: string }[] {
    const rows: { label: string; value: string }[] = [];
    if (!ch || typeof ch !== 'object') {
      return [{ label: 'Changes', value: '—' }];
    }

    const usedKeys = new Set<string>();

    const et = ch['eventType'] ?? ch['EventType'];
    if (et != null) {
      rows.push({ label: 'Event', value: String(et) });
      usedKeys.add('eventType');
      usedKeys.add('EventType');
    }

    const deptId = ch['departmentId'] ?? ch['DepartmentId'];
    if (deptId != null) {
      rows.push({ label: 'Department ID', value: String(deptId) });
      usedKeys.add('departmentId');
      usedKeys.add('DepartmentId');
    }

    const inner = ch['changes'] ?? ch['Changes'];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      usedKeys.add('changes');
      usedKeys.add('Changes');
      for (const [k, v] of Object.entries(inner as Record<string, unknown>)) {
        rows.push(...this.formatChangeEntry(k, v));
      }
    }

    // Flat ministry snapshot (MinistryName, Logo, Address, …) lives on the root of `changes`
    for (const [k, v] of Object.entries(ch)) {
      if (usedKeys.has(k)) continue;
      rows.push(...this.formatChangeEntry(k, v));
    }

    const visibleRows = rows.filter((r) => this.hasDisplayValue(r.value));
    if (visibleRows.length === 0) {
      return [{ label: 'Details', value: '—' }];
    }
    return visibleRows;
  }

  private formatChangeEntry(key: string, v: unknown): { label: string; value: string }[] {
    if (v && typeof v === 'object' && v !== null && !Array.isArray(v) && 'from' in v && 'to' in v) {
      const ft = v as { from: unknown; to: unknown };
      return [{ label: this.formatLabel(key), value: `${ft.from} → ${ft.to}` }];
    }
    if (Array.isArray(v)) {
      const label = this.formatLabel(key);
      if (v.length === 0) return [{ label, value: '—' }];
      return v.map((item, i) => {
        if (item && typeof item === 'object') {
          const lines = Object.entries(item as Record<string, unknown>).map(
            ([k2, v2]) => `${this.formatLabel(k2)}: ${v2 == null ? '—' : String(v2)}`,
          );
          return { label: `${label} (${i + 1})`, value: lines.join(' · ') };
        }
        return { label: `${label} (${i + 1})`, value: String(item) };
      });
    }
    if (v && typeof v === 'object' && v !== null) {
      const nested = v as Record<string, unknown>;
      const out: { label: string; value: string }[] = [];
      for (const [nk, nv] of Object.entries(nested)) {
        out.push(...this.formatChangeEntry(`${key}.${nk}`, nv));
      }
      return out.length ? out : [{ label: this.formatLabel(key), value: '—' }];
    }
    return [{ label: this.formatLabel(key), value: v == null ? '—' : String(v) }];
  }

  private formatLabel(key: string): string {
    const leaf = key.includes('.') ? key.split('.').pop()! : key;
    if (this.fieldLabels[leaf]) return this.fieldLabels[leaf];
    return leaf
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .replace(/\./g, ' › ')
      .trim();
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

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  toggleAccordion(id: string, event?: Event): void {
    event?.stopPropagation();
    const next = new Set(this.expandedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expandedIds.set(next);
  }

  onDownload(row: MinistryHistoryViewRow, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (row.downloadDisabled) {
      this.utils.showToast('No attachment available for this entry.', 'Download', 'info');
      return;
    }
    const historyId = Number(row.id);
    if (isNaN(historyId)) {
      this.utils.showToast('Invalid history entry.', 'Download', 'error');
      return;
    }
    this.api.downloadMinistryHistoryDocument(historyId).subscribe({
      next: (response: HttpResponse<Blob>) => {
        const blob = response.body;
        if (!blob) {
          this.utils.showToast('No document content received.', 'Download', 'error');
          return;
        }
        const filename = this.getDownloadFilenameFromResponse(response, row.refId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this.utils.showToast('Document downloaded.', 'Download', 'success');
      },
      error: (err) => {
        this.utils.showToast(err, 'Failed to download.', 'error');
      },
    });
  }

  private getDownloadFilenameFromResponse(response: HttpResponse<Blob>, refNumber: string): string {
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = this.parseFilenameFromContentDisposition(contentDisposition);
    if (filename) return this.sanitizeFilename(filename);

    const contentType = response.headers.get('Content-Type') || '';
    const extension = this.getExtensionFromMimeType(contentType);
    const base = refNumber && refNumber !== '—' ? `ref-${refNumber}` : 'ministry-history-document';
    return `${base}${extension}`;
  }

  private parseFilenameFromContentDisposition(header: string | null): string | null {
    if (!header) return null;
    const starMatch = header.match(/filename\*=UTF-8''([^;\s]+)/i);
    if (starMatch?.[1]) {
      try {
        return decodeURIComponent(starMatch[1].trim());
      } catch {
        return starMatch[1].trim();
      }
    }
    const normalMatch = header.match(/filename=["']?([^"';]+)["']?/i);
    if (normalMatch?.[1]) return normalMatch[1].trim();
    return null;
  }

  private getExtensionFromMimeType(contentType: string): string {
    const mime = contentType.split(';')[0].trim().toLowerCase();
    const map: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'text/plain': '.txt',
    };
    return map[mime] ?? '.bin';
  }

  private sanitizeFilename(name: string): string {
    const base = name.replace(/^.*[/\\]/, '').trim() || 'document';
    return base.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'document';
  }

  /** Hide fields that have no usable value (empty / null-like placeholders). */
  private hasDisplayValue(value: string): boolean {
    if (value == null) return false;
    const v = String(value).trim().toLowerCase();
    if (v === '' || v === '—' || v === 'null' || v === 'undefined' || v === 'n/a' || v === 'na') {
      return false;
    }
    return true;
  }
}
