import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiResponse, ApiService } from '../../../services/api.service';
import { UtilsService } from '../../../services/utils.service';
import { ActiveIncident } from '../active-incidents/active-incidents.component';

interface TimelineEvent {
  id: number;
  time: string;
  user: string;
  description: string;
  status: string;
}

type IncidentDetails = ActiveIncident & { severityCode?: string; departmentName?: string };

@Component({
  selector: 'app-incident-details',
  templateUrl: './incident-details.component.html',
  styleUrl: './incident-details.component.scss',
  standalone: false,
})
export class IncidentDetailsComponent implements OnInit {
  incidentId: string | null = null;
  incident = signal<IncidentDetails | null>(null);
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  timelineEvents = signal<TimelineEvent[]>([]);
  submittingComment = signal<boolean>(false);
  commentText: string = '';
  selectedStatus: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private utils: UtilsService
  ) {}

  ngOnInit(): void {
    this.incidentId = this.route.snapshot.paramMap.get('id');

    if (this.incidentId) {
      this.loadIncidentDetails(Number(this.incidentId));
    } else {
      this.errorMessage.set('Incident ID is required');
      this.utils.showToast('Incident ID is required', 'Error', 'error');
      this.router.navigate(['/incidents']);
    }
  }

  loadIncidentDetails(incidentId: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.timelineEvents.set([]);

    this.apiService.getIncidentDetailsById(incidentId).subscribe({
      next: (response: ApiResponse<any>) => {
        this.loading.set(false);
        if (response.isSuccessful && response.data) {
          const data = response.data;
          this.incident.set(this.processIncidentData(data));
          this.loadTimelineFromComments(incidentId, data);
        } else {
          this.errorMessage.set(response.message || 'Failed to load incident details');
          this.utils.showToast(response.message || 'Failed to load incident details', 'Error', 'error');
        }
      },
      error: (error: any) => {
        this.loading.set(false);
        this.errorMessage.set('Error loading incident details');
        this.utils.showToast('Error loading incident details', 'Error', 'error');
        console.error('Error loading incident:', error);
      },
    });
  }

  /**
   * Load timeline from GET /api/Incident/{id}/comments.
   * Maps comment items (id, comment, status, createdBy, createdAt) to TimelineEvent[].
   * Falls back to details.timeline when comments API fails or returns empty.
   */
  private loadTimelineFromComments(incidentId: number, detailsData: any): void {
    this.apiService.getIncidentCommentsById(incidentId).subscribe({
      next: (res: ApiResponse<any[]>) => {
        if (res.isSuccessful && Array.isArray(res.data) && res.data.length > 0) {
          const events: TimelineEvent[] = res.data.map((c: any, idx: number) => ({
            id: c.id ?? idx + 1,
            time: this.formatTimelineTime(c.createdAt),
            user: c.createdBy ?? '—',
            description: c.comment ?? '—',
            status: c.status ?? '—',
          }));
          this.timelineEvents.set(events);
        } else {
          this.mapTimelineFromDetails(detailsData);
        }
      },
      error: () => this.mapTimelineFromDetails(detailsData),
    });
  }

  /** Refetch comments and update timeline (e.g. after adding a comment). */
  private refreshTimeline(): void {
    const id = this.incidentId;
    if (!id) return;
    const numId = Number(id);
    this.apiService.getIncidentCommentsById(numId).subscribe({
      next: (res: ApiResponse<any[]>) => {
        if (res.isSuccessful && Array.isArray(res.data) && res.data.length > 0) {
          const events: TimelineEvent[] = res.data.map((c: any, idx: number) => ({
            id: c.id ?? idx + 1,
            time: this.formatTimelineTime(c.createdAt),
            user: c.createdBy ?? '—',
            description: c.comment ?? '—',
            status: c.status ?? '—',
          }));
          this.timelineEvents.set(events);
        }
      },
    });
  }

  /**
   * Fallback: map timeline from details API (timeline / history / events).
   */
  private mapTimelineFromDetails(data: any): void {
    const raw = data?.timeline ?? data?.history ?? data?.events;
    if (!Array.isArray(raw) || raw.length === 0) {
      this.timelineEvents.set([]);
      return;
    }
    const events: TimelineEvent[] = raw.map((e: any, idx: number) => ({
      id: e.id ?? idx + 1,
      time: e.time ?? this.formatTimelineTime(e.createdAt ?? e.date ?? e.timestamp),
      user: e.user ?? e.createdBy ?? e.userName ?? '—',
      description: e.description ?? e.comment ?? e.text ?? '—',
      status: e.status ?? '—',
    }));
    this.timelineEvents.set(events);
  }

  private formatTimelineTime(value: string | undefined): string {
    if (!value) return '—';
    try {
      const d = new Date(value);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(value);
    }
  }

  private processIncidentData(data: any): IncidentDetails {
    const kpi = data.kpiName ?? data.kpi ?? data.kpiDescription ?? data.description ?? 'N/A';
    const dept = (data.department ?? data.departmentName ?? '') || undefined;
    return {
      ...data,
      status: data.status ?? 'Open',
      statusSince: data.statusSince ? `Since: ${data.statusSince}` : `Since: ${this.formatTimeAgo(data.createdAt)}`,
      createdAgo: data.createdAgo ? `Created: ${data.createdAgo}` : `Created: ${this.formatTimeAgo(data.createdAt)}`,
      severityCode: this.formatSeverityCode(data.severity),
      severityDescription: data.severityDescription ?? data.severity ?? 'N/A',
      assetName: data.assetName ?? (data.assetId != null ? `Asset ${data.assetId}` : 'N/A'),
      ministryName: data.ministry ?? data.ministryName ?? 'N/A',
      kpiDescription: kpi,
      assetUrl: data.assetUrl ?? '',
      departmentName: dept,
      updatedBy: data.assignedTo ?? data.updatedBy,
    } as IncidentDetails;
  }

  formatSeverityCode(severity: string | undefined): string {
    if (!severity) return 'N/A';
    const s = severity.includes(' - ') ? severity.split(' - ')[0].trim() : severity;
    if (s.toUpperCase().startsWith('P')) return s.toUpperCase();
    const n = parseInt(s);
    if (!isNaN(n) && n >= 1 && n <= 4) return `P${n}`;
    return s;
  }

  formatTimeAgo(dateString: string): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / 60000);
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'min' : 'mins'} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
      } else {
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
      }
    } catch (error) {
      return 'N/A';
    }
  }

  /** Severity badge bg — uses CSS variables from styles.scss */
  getSeverityBadgeColor(severity: string): string {
    if (!severity || severity === 'N/A') return 'var(--severity-na-bg)';
    const level = severity.toString().toUpperCase();
    if (level.includes('CRITICAL') || level === 'P1' || level === '1') return 'var(--severity-critical-bg)';
    if (level.includes('HIGH') || level === 'P2' || level === '2') return 'var(--severity-high-bg)';
    if (level.includes('MEDIUM') || level.includes('MODERATE') || level === 'P3' || level === '3') return 'var(--severity-medium-bg)';
    if (level.includes('LOW') || level === 'INFO' || level === 'P4' || level === '4') return 'var(--severity-low-bg)';
    return 'var(--severity-na-bg)';
  }

  /** Severity badge text */
  getSeverityBadgeTextColor(severity: string): string {
    if (!severity || severity === 'N/A') return 'var(--severity-na-text)';
    const level = severity.toString().toUpperCase();
    if (level.includes('CRITICAL') || level === 'P1' || level === '1') return 'var(--severity-critical-text)';
    if (level.includes('HIGH') || level === 'P2' || level === '2') return 'var(--severity-high-text)';
    if (level.includes('MEDIUM') || level.includes('MODERATE') || level === 'P3' || level === '3') return 'var(--severity-medium-text)';
    if (level.includes('LOW') || level === 'INFO' || level === 'P4' || level === '4') return 'var(--severity-low-text)';
    return 'var(--severity-na-text)';
  }

  /** Severity badge border */
  getSeverityBorderColor(severity: string): string {
    if (!severity || severity === 'N/A') return 'var(--severity-na-border)';
    const level = severity.toString().toUpperCase();
    if (level.includes('CRITICAL') || level === 'P1' || level === '1') return 'var(--severity-critical-border)';
    if (level.includes('HIGH') || level === 'P2' || level === '2') return 'var(--severity-high-border)';
    if (level.includes('MEDIUM') || level.includes('MODERATE') || level === 'P3' || level === '3') return 'var(--severity-medium-border)';
    if (level.includes('LOW') || level === 'INFO' || level === 'P4' || level === '4') return 'var(--severity-low-border)';
    return 'var(--severity-na-border)';
  }

  getStatusBadgeColor(status: string): string {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'OPEN') {
      return 'var(--color-light-lightgrey2)';
    } else if (statusUpper === 'INVESTIGATING') {
      return 'var(--color-red-light)';
    } else if (statusUpper === 'FIXING') {
      return 'var(--color-yellow-light)';
    } else if (statusUpper === 'MONITORING') {
      return 'var(--color-green-light)';
    } else if (statusUpper === 'RESOLVED' || statusUpper === 'CLOSED') {
      return '#B2F5EA';
    } else if (statusUpper === 'IN PROGRESS' || statusUpper === 'IN_PROGRESS') {
      return 'var(--color-blue-light)';
    }
    return '#F3F4F6';
  }

  getStatusBadgeTextColor(status: string): string {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'OPEN') {
      return 'var(--color-text-white)';
    } else if (statusUpper === 'INVESTIGATING') {
      return 'var(--color-red)';
    } else if (statusUpper === 'FIXING') {
      return 'var(--color-yellow)';
    } else if (statusUpper === 'MONITORING') {
      return 'var(--color-green-dark)';
    } else if (statusUpper === 'RESOLVED' || statusUpper === 'CLOSED') {
      return '#047857';
    } else if (statusUpper === 'IN PROGRESS' || statusUpper === 'IN_PROGRESS') {
      return 'var(--color-blue-dark)';
    }
    return '#1F2937';
  }

  onBack(): void {
    this.router.navigate(['/incidents']);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  }

  getSeverityLabel(severity: string): string {
    if (!severity) return 'N/A';
    const level = severity.toString().toUpperCase();
    if (level.includes(' - ')) {
      const label = level.split(' - ')[1]?.trim();
      if (label === 'CRITICAL' || label === 'HIGH' || label === 'MEDIUM' || label === 'LOW') return label;
    }
    if (level.includes('CRITICAL') || level === 'P1' || level === '1') return 'CRITICAL';
    if (level.includes('HIGH') || level === 'P2' || level === '2') return 'HIGH';
    if (level.includes('MEDIUM') || level.includes('MODERATE') || level === 'P3' || level === '3') return 'MEDIUM';
    if (level.includes('LOW') || level === 'INFO' || level === 'P4' || level === '4') return 'LOW';
    return 'N/A';
  }

  formatDateShort(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  }

  getDepartmentName(): string {
    return this.incident()?.departmentName ?? '';
  }

  onSubmitComment(): void {
    if (!this.commentText.trim() && !this.selectedStatus) {
      this.utils.showToast('Please enter a comment or select a status', 'Validation Error', 'warning');
      return;
    }
    const id = this.incidentId;
    if (!id) return;
    const numId = Number(id);
    const comment = this.commentText.trim();
    const status = this.selectedStatus || this.incident()?.status || 'Open';

    this.submittingComment.set(true);
    const payload = { incidentId: numId, comment: comment || '', status };

    this.apiService.addIncidentComment(numId, payload).subscribe({
      next: (res: ApiResponse<any>) => {
        this.submittingComment.set(false);
        if (res.isSuccessful) {
          this.refreshTimeline();
          if (this.selectedStatus && this.incident()) {
            this.incident.set({ ...this.incident()!, status: this.selectedStatus });
          }
          this.commentText = '';
          this.selectedStatus = '';
          this.utils.showToast(res.message || 'Comment added successfully', 'Success', 'success');
        } else {
          this.utils.showToast(res.message || 'Failed to add comment', 'Error', 'error');
        }
      },
      error: (err: any) => {
        this.submittingComment.set(false);
        this.utils.showToast('Failed to add comment', 'Error', 'error');
        console.error('Add comment error:', err);
      },
    });
  }

  onEdit(): void {
    // Navigate to edit incident page or open modal
    if (this.incidentId) {
      // TODO: Implement edit functionality
      console.log('Edit incident:', this.incidentId);
    }
  }
}
