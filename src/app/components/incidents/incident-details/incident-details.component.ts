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

@Component({
  selector: 'app-incident-details',
  templateUrl: './incident-details.component.html',
  styleUrl: './incident-details.component.scss',
  standalone: false,
})
export class IncidentDetailsComponent implements OnInit {
  incidentId: string | null = null;
  incident = signal<(ActiveIncident & { severityCode?: string }) | null>(null);
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  timelineEvents = signal<TimelineEvent[]>([]);
  commentText: string = '';
  selectedStatus: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private utils: UtilsService
  ) {}

  ngOnInit(): void {
    // Get incident ID from route params
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

    this.apiService.getIncidentById(incidentId).subscribe({
      next: (response: ApiResponse<any>) => {
        this.loading.set(false);
        if (response.isSuccessful && response.data) {
          this.incident.set(this.processIncidentData(response.data));
          this.loadTimelineEvents(incidentId);
        } else {
          this.errorMessage.set(response.message || 'Failed to load incident details');
          this.utils.showToast(response.message || 'Failed to load incident details', 'Error', 'error');
        }
      },
      error: (error: any) => {
        this.loading.set(false);
        this.errorMessage.set('Error loading incident details');
        this.utils.showToast(error, 'Error loading incident details', 'error');
        console.error('Error loading incident:', error);
      },
    });
  }

  loadTimelineEvents(incidentId: number): void {
    // TODO: Replace with actual API call when timeline endpoint is available
    // For now, generate sample timeline events
    const events: TimelineEvent[] = [
      {
        id: 1,
        time: '12:00 PM',
        user: 'username123',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        status: 'INVESTIGATING'
      },
      {
        id: 2,
        time: '1:30 PM',
        user: 'username456',
        description: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        status: 'MONITORING'
      },
      {
        id: 3,
        time: '3:00 PM',
        user: 'username789',
        description: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
        status: 'RESOLVED'
      }
    ];
    this.timelineEvents.set(events);
  }

  private processIncidentData(data: any): ActiveIncident & { severityCode: string } {
    return {
      ...data,
      status: data.status || 'Open',
      statusSince: data.statusSince ? `Since: ${data.statusSince}` : `Since: ${this.formatTimeAgo(data.createdAt)}`,
      createdAgo: data.createdAgo ? `Created: ${data.createdAgo}` : `Created: ${this.formatTimeAgo(data.createdAt)}`,
      severityCode: this.formatSeverityCode(data.severity),
      severityDescription: data.severityDescription || data.severity || 'N/A',
      assetName: data.assetName || `Asset ${data.assetId}`,
      ministryName: data.ministryName || 'N/A',
      kpiDescription: data.kpiDescription || data.description || 'N/A',
      assetUrl: data.assetUrl || '',
    } as ActiveIncident & { severityCode: string };
  }

  formatSeverityCode(severity: string | undefined): string {
    if (!severity) return 'N/A';
    if (severity.toUpperCase().startsWith('P')) {
      return severity.toUpperCase();
    }
    const severityNum = parseInt(severity);
    if (!isNaN(severityNum) && severityNum >= 1 && severityNum <= 4) {
      return `P${severityNum}`;
    }
    return severity;
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

  getSeverityBadgeColor(severity: string): string {
    if (!severity || severity === 'N/A') return '#F3F4F6'; // Light grey for N/A
    const level = severity.toString().toUpperCase();
    if (level === 'P1' || level === '1' || level === 'P1 CRITICAL' || level === 'CRITICAL') {
      return '#EF4444'; // Red background for P1/CRITICAL
    } else if (level === 'P2' || level === '2' || level === 'P2 HIGH' || level === 'HIGH') {
      return 'var(--color-orange-light)';
    } else if (level === 'P3' || level === '3' || level === 'P3 MEDIUM' || level === 'MEDIUM' || level === 'MODERATE') {
      return 'var(--color-yellow-light)';
    } else if (level === 'P4' || level === '4' || level === 'P4 LOW' || level === 'LOW' || level === 'INFO') {
      return 'var(--color-green-light)';
    }
    return '#F3F4F6'; // Light grey default
  }

  getSeverityBadgeTextColor(severity: string): string {
    if (!severity || severity === 'N/A') return '#6B7280'; // Dark grey text for N/A
    const level = severity.toString().toUpperCase();
    if (level === 'P1' || level === '1' || level === 'P1 CRITICAL' || level === 'CRITICAL') {
      return 'var(--color-red)';
    } else if (level === 'P2' || level === '2' || level === 'P2 HIGH' || level === 'HIGH') {
      return 'var(--color-orange)';
    } else if (level === 'P3' || level === '3' || level === 'P3 MEDIUM' || level === 'MEDIUM' || level === 'MODERATE') {
      return 'var(--color-yellow)';
    } else if (level === 'P4' || level === '4' || level === 'P4 LOW' || level === 'LOW' || level === 'INFO') {
      return 'var(--color-green-dark)';
    }
    return '#6B7280'; // Dark grey default
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
    if (level === 'P1' || level === '1' || level === 'P1 CRITICAL' || level === 'CRITICAL') {
      return 'CRITICAL';
    } else if (level === 'P2' || level === '2' || level === 'P2 HIGH' || level === 'HIGH') {
      return 'HIGH';
    } else if (level === 'P3' || level === '3' || level === 'P3 MEDIUM' || level === 'MEDIUM' || level === 'MODERATE') {
      return 'MEDIUM';
    } else if (level === 'P4' || level === '4' || level === 'P4 LOW' || level === 'LOW' || level === 'INFO') {
      return 'LOW';
    }
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
    // TODO: Get department name from API or incident data
    return '';
  }

  onSubmitComment(): void {
    if (!this.commentText.trim() && !this.selectedStatus) {
      this.utils.showToast('Please enter a comment or select a status', 'Validation Error', 'warning');
      return;
    }

    // TODO: Implement API call to submit comment and update status
    console.log('Submitting comment:', {
      comment: this.commentText,
      status: this.selectedStatus,
      incidentId: this.incidentId
    });

    // Add comment to timeline
    if (this.commentText.trim()) {
      const newEvent: TimelineEvent = {
        id: this.timelineEvents().length + 1,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        user: 'Current User', // TODO: Get from auth service
        description: this.commentText,
        status: this.selectedStatus || this.incident()?.status || 'OPEN'
      };
      this.timelineEvents.update(events => [newEvent, ...events]);
    }

    // Update status if selected
    if (this.selectedStatus && this.incident()) {
      const updatedIncident = { ...this.incident()!, status: this.selectedStatus };
      this.incident.set(updatedIncident);
    }

    // Reset form
    this.commentText = '';
    this.selectedStatus = '';

    this.utils.showToast('Comment submitted successfully', 'Success', 'success');
  }

  onEdit(): void {
    // Navigate to edit incident page or open modal
    if (this.incidentId) {
      // TODO: Implement edit functionality
      console.log('Edit incident:', this.incidentId);
    }
  }
}
