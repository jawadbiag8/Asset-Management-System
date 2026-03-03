import { Component, signal, computed } from '@angular/core';

export interface AuditLogEntry {
  id: string;
  dateTime: string;
  editedBy: string;
  referenceNumber: string;
  assetStatusChanged: string;
  description: string;
}

@Component({
  selector: 'app-asset-audit-log',
  templateUrl: './asset-audit-log.component.html',
  styleUrl: './asset-audit-log.component.scss',
  standalone: false,
})
export class AssetAuditLogComponent {
  searchTerm = signal<string>('');
  /** Set of log entry ids that are expanded (accordion open) */
  expandedIds = signal<Set<string>>(new Set<string>());

  /** Sample audit log entries – replace with API data when backend is ready */
  private readonly allLogs = signal<AuditLogEntry[]>([
    {
      id: '1',
      dateTime: '09/02/2026 10:12 AM',
      editedBy: 'PDA-analyst123',
      referenceNumber: '1234567890',
      assetStatusChanged: 'Discovered',
      description:
        'ajsfhashikfaslkfikasikfhasikfhlaskflkasjflkasfjlafj;ajf;aljf;laf;lajf;ljal;fja;lfj;alf;l',
    },
    {
      id: '2',
      dateTime: '09/02/2026 10:12 AM',
      editedBy: 'PDA-analyst123',
      referenceNumber: '1234567890',
      assetStatusChanged: 'Active',
      description: 'Asset was marked as active after verification.',
    },
    {
      id: '3',
      dateTime: '08/02/2026 03:45 PM',
      editedBy: 'PDA-analyst456',
      referenceNumber: '1234567891',
      assetStatusChanged: 'Under Review',
      description: 'Status updated for compliance review cycle.',
    },
    {
      id: '4',
      dateTime: '07/02/2026 11:00 AM',
      editedBy: 'PDA-analyst123',
      referenceNumber: '1234567892',
      assetStatusChanged: 'Discovered',
      description: 'New digital asset discovered and registered in the system.',
    },
  ]);

  /** Filtered list by search (date, editedBy, referenceNumber, status, description) */
  filteredLogs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const logs = this.allLogs();
    if (!term) return logs;
    return logs.filter(
      (log) =>
        log.dateTime.toLowerCase().includes(term) ||
        log.editedBy.toLowerCase().includes(term) ||
        log.referenceNumber.toLowerCase().includes(term) ||
        log.assetStatusChanged.toLowerCase().includes(term) ||
        log.description.toLowerCase().includes(term)
    );
  });

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
    // TODO: open reference document (e.g. modal or new tab) using log.referenceNumber
  }
}
