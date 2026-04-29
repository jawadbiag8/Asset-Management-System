import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { ApiService, ApiResponse } from '../../services/api.service';

/** Single contact from GET Asset (contacts[]). */
export interface AssetContact {
  contactName?: string;
  contactTitle?: string;
  contactNumber?: string;
  contactEmail?: string;
  type?: string;
}
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { UtilsService } from '../../services/utils.service';
import { formatDateOrPassThrough } from '../../utils/date-format.util';

@Component({
  selector: 'app-view-assets-detail',
  standalone: false,
  templateUrl: './view-assets-detail.component.html',
  styleUrl: './view-assets-detail.component.scss',
})
export class ViewAssetsDetailComponent implements OnInit, OnDestroy {
  assetId: number | null = null;
  ministryId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private breadcrumbService: BreadcrumbService,
    private utils: UtilsService,
  ) {}

  ngOnInit() {
    // React only when id or ministryId change (not when incident filters change URL)
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];
      const ministryId = params['ministryId'];
      const idChanged = id != null && +id !== this.assetId;
      const ministryIdChanged =
        ministryId != null && +ministryId !== this.ministryId;
      if (id) this.assetId = +id;
      if (ministryId) this.ministryId = +ministryId;
      if (idChanged && this.assetId) this.loadAssetDashboard();
    });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setCurrentLabel(null);
  }

  /** Current route query params so incident filters can be initialised and stay in URL */
  get incidentQueryParams(): Params {
    return this.route.snapshot.queryParams;
  }

  /** When incident filters change, update URL query params. Empty/removed filters are removed from URL (null). */
  onIncidentQueryParamsChange(params: Params): void {
    const current = this.route.snapshot.queryParams;
    const merged: Params = { ...current, ...params };
    // Do not put pagination in URL for asset detail view
    const paginationKeys = ['pageNumber', 'pageSize', 'PageNumber', 'PageSize'];
    paginationKeys.forEach((k) => (merged[k] = null));
    // Remove incident filter keys from URL when value is empty so refresh doesn't re-apply them
    const keysToRemove = Object.keys(merged).filter(
      (k) =>
        k !== 'id' &&
        k !== 'ministryId' &&
        (merged[k] === '' || merged[k] == null),
    );
    keysToRemove.forEach((k) => (merged[k] = null));
    this.router.navigate([], {
      queryParams: merged,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // Asset Details (favorite from dashboard/header API)
  assetDetails = {
    assetName: '',
    url: '',
    ministry: '',
    ministryAddress: '',
    ministryLogoUrl: '',
    department: '',
    assetType: '',
    citizenImpactLevel: '',
    currentStatus: '',
    lastOutage: '',
    currentHealth: '',
    riskExposureIndex: '',
    favorite: false,
  };

  // Summary KPIs
  summaryKpis = {
    citizenHappiness: 0,
    overallCompliance: 0,
    openIncidents: 0,
    highSeverityOpenIncidents: 0,
  };

  // Standards Compliance
  standardsCompliance: { name: string; status: string }[] = [];

  isApplicationAsset = false;
  applicationMetrics = {
    overallScore: '0%',
    availability: '0%',
    adoption: '0%',
    efficiency: '0%',
    reliability: '0%',
  };
  formsAttached: Array<{
    formId: string;
    formName: string;
    serviceName: string;
    totalOccurrences: number;
    completionRate: string;
  }> = [];
  servicesAttached: Array<{
    serviceId: number;
    serviceName: string;
    serviceType: string;
    serviceMode: string;
    serviceStatus: string;
  }> = [];

  // Ownership & Accountability
  ownership = {
    ownerName: '',
    ownerEmail: '',
    ownerContact: '',
    technicalOwnerName: '',
    technicalOwnerEmail: '',
    technicalOwnerContact: '',
  };

  /** Contacts from GET Asset (contacts[]) – used for Technical Contacts section. */
  assetContacts: AssetContact[] = [];

  /** Primary contact from GET Asset contacts (type === 'Business' or contactTitle === 'Primary'). */
  get primaryContact(): AssetContact | null {
    const list = this.assetContacts || [];
    return (
      list.find(
        (c) =>
          String(c?.type ?? '').toLowerCase() === 'business' ||
          String(c?.contactTitle ?? '').toLowerCase() === 'primary',
      ) ?? null
    );
  }

  /** Technical contacts only (type === 'Technical'). */
  get technicalContacts(): AssetContact[] {
    return (this.assetContacts || []).filter(
      (c) => String(c?.type ?? '').toLowerCase() === 'technical',
    );
  }

  loadAssetDashboard() {
    if (!this.assetId) {
      console.error('Asset ID is required');
      return;
    }

    this.apiService.getAssetById(this.assetId).subscribe({
      next: (assetResponse) => {
        if (!assetResponse?.isSuccessful || !assetResponse?.data) {
          this.assetContacts = [];
          this.loadWebsiteAssetDashboard();
          return;
        }

        const data = assetResponse.data as Record<string, unknown>;
        const contacts = (data['contacts'] as AssetContact[]) ?? [];
        this.assetContacts = Array.isArray(contacts) ? contacts : [];

        const assetTypeName = String(data['assetTypeName'] ?? '').trim();
        if (assetTypeName) {
          this.assetDetails.assetType = assetTypeName;
        }
        this.assetDetails.assetName = String(data['assetName'] ?? this.assetDetails.assetName ?? '');
        this.assetDetails.url = String(data['assetUrl'] ?? this.assetDetails.url ?? '');
        this.assetDetails.ministry =
          String(data['ministryName'] ?? this.assetDetails.ministry ?? '');
        this.assetDetails.department =
          String(data['departmentName'] ?? this.assetDetails.department ?? '');
        this.assetDetails.ministryAddress = String(
          data['ministryAddress'] ?? this.assetDetails.ministryAddress ?? '',
        );
        this.assetDetails.ministryLogoUrl = this.resolveLogoUrl(
          String(data['logo'] ?? this.assetDetails.ministryLogoUrl ?? ''),
        );

        const assetMinistryId = Number(data['ministryId']);
        const effectiveMinistryId =
          this.ministryId && this.ministryId > 0
            ? this.ministryId
            : Number.isFinite(assetMinistryId) && assetMinistryId > 0
              ? assetMinistryId
              : null;
        if (effectiveMinistryId) {
          this.loadMinistryMeta(effectiveMinistryId);
        }

        const typeLower = assetTypeName.toLowerCase();
        this.isApplicationAsset =
          typeLower.includes('web application') ||
          typeLower.includes('web app') ||
          typeLower.includes('mobile application') ||
          typeLower.includes('mobile app');

        if (this.isApplicationAsset) {
          this.loadApplicationAssetDetails();
        } else {
          this.loadWebsiteAssetDashboard();
        }
      },
      error: (error) => {
        console.error('Error loading asset:', error);
        this.assetContacts = [];
        this.loadWebsiteAssetDashboard();
      },
    });
  }

  private loadWebsiteAssetDashboard(): void {
    if (!this.assetId) return;
    this.apiService.getAssetsDashboad(this.assetId).subscribe({
      next: (response) => {
        if (!response?.isSuccessful || !response?.data) {
          console.error('API Error:', response?.message);
          return;
        }
        const d = response.data;
        this.assetDetails = {
          ...this.assetDetails,
          assetName: d.assetName ?? this.assetDetails.assetName,
          url: d.assetUrl ?? this.assetDetails.url,
          ministry: d.ministry ?? this.assetDetails.ministry,
          ministryAddress: d.ministryAddress ?? this.assetDetails.ministryAddress,
          ministryLogoUrl: this.resolveLogoUrl(
            d.ministryLogo ?? d.logo ?? this.assetDetails.ministryLogoUrl,
          ),
          department: d.department ?? this.assetDetails.department,
          assetType: d.assetTypeName ?? d.assetType ?? this.assetDetails.assetType,
          citizenImpactLevel: d.citizenImpactLevel ?? '',
          currentStatus: d.currentStatus ?? '',
          lastOutage: d.lastOutage ?? '',
          currentHealth: d.currentHealth ?? '',
          riskExposureIndex: d.riskExposureIndex ?? '',
          favorite: Boolean(d.favorite),
        };
        this.breadcrumbService.setCurrentLabel(
          this.assetDetails.assetName || 'Asset Detail',
        );

        this.summaryKpis = {
          citizenHappiness: Number(d.citizenHappinessMetric) ?? 0,
          overallCompliance: Number(d.overallComplianceMetric) ?? 0,
          openIncidents: Number(d.openIncidents) ?? 0,
          highSeverityOpenIncidents: Number(d.highSeverityOpenIncidents) ?? 0,
        };

        this.standardsCompliance = [
          {
            name: 'Accessibility & Inclusivity',
            status: d.accessibilityInclusivityStatus ?? 'N/A',
          },
          {
            name: 'Availability & Reliability',
            status: d.availabilityReliabilityStatus ?? 'N/A',
          },
          {
            name: 'Navigation & Discoverability',
            status: d.navigationDiscoverabilityStatus ?? 'N/A',
          },
          {
            name: 'Performance & Efficiency',
            status: d.performanceEfficiencyStatus ?? 'N/A',
          },
          {
            name: 'Security, Trust & Privacy',
            status: d.securityTrustPrivacyStatus ?? 'N/A',
          },
          {
            name: 'User Experience & Journey Quality',
            status: d.userExperienceJourneyQualityStatus ?? 'N/A',
          },
        ];

        const na = (v: any) =>
          v == null || String(v).trim() === '' || String(v).toUpperCase() === 'NA'
            ? 'N/A'
            : String(v).trim();
        this.ownership = {
          ownerName: d.ownerName?.trim() || 'Not Assigned',
          ownerEmail: na(d.ownerEmail),
          ownerContact: na(d.ownerContact),
          technicalOwnerName: d.technicalOwnerName?.trim() || 'Not Assigned',
          technicalOwnerEmail: na(d.technicalOwnerEmail),
          technicalOwnerContact: na(d.technicalOwnerContact),
        };
      },
      error: (error) => {
        console.error('Error loading website asset dashboard:', error);
      },
    });
  }

  private loadApplicationAssetDetails(): void {
    if (!this.assetId) return;
    this.apiService.getAssetApplicationDetails(this.assetId).subscribe({
      next: (response) => {
        if (!response?.isSuccessful || !response?.data) {
          return;
        }
        const d = response.data as Record<string, any>;
        const metrics = (d['applicationMetrics'] ?? {}) as Record<string, any>;
        this.assetDetails = {
          ...this.assetDetails,
          assetName: d['assetName'] ?? this.assetDetails.assetName,
          url: d['assetUrl'] ?? this.assetDetails.url,
          ministry: d['ministryName'] ?? this.assetDetails.ministry,
          ministryAddress: d['ministryAddress'] ?? this.assetDetails.ministryAddress,
          ministryLogoUrl: this.resolveLogoUrl(
            d['logo'] ?? this.assetDetails.ministryLogoUrl,
          ),
          department: d['departmentName'] ?? this.assetDetails.department,
          assetType: d['assetTypeName'] ?? this.assetDetails.assetType,
          favorite: Boolean(this.assetDetails.favorite),
        };
        this.breadcrumbService.setCurrentLabel(
          this.assetDetails.assetName || 'Asset Detail',
        );

        this.applicationMetrics = {
          overallScore: String(metrics['overallScore'] ?? '0%'),
          availability: String(metrics['availability'] ?? '0%'),
          adoption: String(metrics['successRate'] ?? '0%'),
          efficiency: String(metrics['efficiency'] ?? '0%'),
          reliability: String(metrics['reliability'] ?? '0%'),
        };

        const services = Array.isArray(d['servicesAttached']) ? d['servicesAttached'] : [];
        this.servicesAttached = services.map((service: any) => ({
          serviceId: Number(service.serviceId ?? 0),
          serviceName: String(service.serviceName ?? 'N/A'),
          serviceType: String(service.serviceType ?? 'N/A'),
          serviceMode: String(service.serviceMode ?? 'N/A'),
          serviceStatus: String(service.serviceStatus ?? 'Unknown'),
        }));

        const forms = Array.isArray(d['formsAttached']) ? d['formsAttached'] : [];
        this.formsAttached = forms.map((form: any) => ({
          formId: String(form.formId ?? ''),
          formName: String(form.formName ?? 'N/A'),
          serviceName: String(form.serviceName ?? 'N/A'),
          totalOccurrences: Number(form?.last7Days?.totalOccurrences ?? 0),
          completionRate: String(form?.last7Days?.completionRate ?? '0%'),
        }));

        const appContacts = Array.isArray(d['contacts']) ? d['contacts'] : [];
        this.assetContacts = appContacts;
      },
      error: () => {},
    });
  }

  /** Format date/datetime as MM/DD/YYYY or MM/DD/YYYY, time; otherwise pass through (e.g. "5 mins ago"). */
  formatLastOutage(value: string | null | undefined): string {
    if (value == null || value === '') return 'N/A';
    return formatDateOrPassThrough(value);
  }

  getAssetTypeIconKind():
    | 'website'
    | 'web-application'
    | 'mobile-application'
    | 'other' {
    const raw = String(this.assetDetails.assetType ?? '').trim().toLowerCase();
    if (!raw) return 'other';
    if (raw.includes('website')) return 'website';
    if (raw.includes('web application') || raw.includes('web app'))
      return 'web-application';
    if (raw.includes('mobile application') || raw.includes('mobile app'))
      return 'mobile-application';
    return 'other';
  }

  getCircularProgressStyle(value: string | number | null | undefined): string {
    return this.getCircularProgressStyleWithColor(value, '#facc15');
  }

  getCircularProgressStyleWithColor(
    value: string | number | null | undefined,
    color: string,
  ): string {
    const n = this.parsePercent(value);
    const angle = Math.max(0, Math.min(100, n)) * 3.6;
    return `conic-gradient(${color} ${angle}deg, rgba(255,255,255,0.16) ${angle}deg 360deg)`;
  }

  private parsePercent(value: string | number | null | undefined): number {
    const n = Number(String(value ?? '0').replace('%', '').trim());
    return Number.isFinite(n) ? n : 0;
  }

  private loadMinistryMeta(ministryId: number): void {
    this.apiService.getMinistryDetailById(ministryId).subscribe({
      next: (res) => {
        if (!res?.isSuccessful || !res?.data) return;
        const data = res.data as Record<string, unknown>;
        const address = String(data['address'] ?? '').trim();
        const logoPath = String(data['logo'] ?? '').trim();
        if (address) {
          this.assetDetails.ministryAddress = address;
        }
        if (logoPath) {
          this.assetDetails.ministryLogoUrl = this.resolveLogoUrl(logoPath);
        }
      },
      error: () => {},
    });
  }

  private resolveLogoUrl(logoPath: string | null | undefined): string {
    if (!logoPath) return '';
    if (/^https?:\/\//i.test(logoPath)) return logoPath;
    const cleanedLogoPath = logoPath.replace(/^\/+/, '');
    try {
      const apiBase = new URL(this.apiService.baseUrl);
      return `${apiBase.protocol}//${apiBase.hostname}/${cleanedLogoPath}`;
    } catch {
      return cleanedLogoPath;
    }
  }

  /** Compliance Overview badge class (High/Medium/Low/N/A – case-insensitive). */
  getStatusBadgeClass(status: string | undefined | null): string {
    const u = String(status ?? '').trim().toUpperCase();
    if (u === 'HIGH') return 'status-badge-high';
    if (u === 'MEDIUM') return 'status-badge-medium';
    if (u === 'LOW') return 'status-badge-low';
    return 'status-badge-unknown';
  }

  /** Compliance status display label (title case). */
  getComplianceStatusLabel(status: string | undefined | null): string {
    const u = String(status ?? '').trim().toUpperCase();
    if (u === 'HIGH') return 'High';
    if (u === 'MEDIUM') return 'Medium';
    if (u === 'LOW') return 'Low';
    return status?.trim() || 'N/A';
  }

  /** Value class for metrics/status panel (same as asset-control-panel): value-success | value-warning | value-danger | value-unknown */
  getHeaderValueClass(
    value: string | undefined | null,
    type: 'citizenImpact' | 'health' | 'risk' | 'status',
  ): string {
    const badge =
      type === 'status'
        ? this.getHeaderStatusBadgeClass(value)
        : this.getHeaderMetricBadgeClass(value, type);
    if (badge === 'badge-status-success') return 'value-success';
    if (badge === 'badge-status-warning') return 'value-warning';
    if (badge === 'badge-status-danger') return 'value-danger';
    return 'value-unknown';
  }

  private getHeaderMetricBadgeClass(
    value: string | undefined | null,
    type: 'citizenImpact' | 'health' | 'risk',
  ): string {
    if (!value) return 'badge-status-unknown';
    const u = String(value).trim().toUpperCase();
    if (type === 'citizenImpact') {
      if (u.includes('LOW')) return 'badge-status-success';
      if (u.includes('MEDIUM')) return 'badge-status-warning';
      if (u.includes('HIGH')) return 'badge-status-danger';
      return 'badge-status-unknown';
    }
    if (type === 'health') {
      if (u.includes('GOOD') || u.includes('EXCELLENT') || u.includes('HEALTHY') || u.includes('HIGH'))
        return 'badge-status-success';
      if (u.includes('AVERAGE') || u.includes('FAIR') || u.includes('MODERATE') || u.includes('MEDIUM'))
        return 'badge-status-warning';
      if (u.includes('POOR') || u.includes('CRITICAL') || u.includes('LOW')) return 'badge-status-danger';
      return 'badge-status-unknown';
    }
    if (type === 'risk') {
      if (u.includes('LOW')) return 'badge-status-success';
      if (u.includes('MEDIUM')) return 'badge-status-warning';
      if (u.includes('HIGH')) return 'badge-status-danger';
      return 'badge-status-unknown';
    }
    return 'badge-status-unknown';
  }

  private getHeaderStatusBadgeClass(status: string | undefined | null): string {
    if (!status) return 'badge-status-unknown';
    const s = String(status).trim().toUpperCase();
    if (s.includes('UP') || s.includes('ONLINE')) return 'badge-status-success';
    if (s.includes('DOWN') || s.includes('OFFLINE')) return 'badge-status-danger';
    if (s.includes('WARNING') || s.includes('PARTIAL') || s.includes('DEGRADED')) return 'badge-status-warning';
    return 'badge-status-unknown';
  }

  /** Display value for metric (capitalized). */
  getHeaderDisplayValue(value: string | undefined | null, _type: string): string {
    if (!value) return 'Unknown';
    const part = String(value).split('-')[0]?.trim() || value;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }

  /** Arrow/bar indicator: 'up' | 'down' for citizen/risk. */
  getMetricIndicator(
    value: string | undefined | null,
    type: 'citizenImpact' | 'risk',
  ): 'up' | 'down' | null {
    if (!value) return null;
    const u = String(value).trim().toUpperCase();
    if (type === 'citizenImpact') {
      if (u.includes('HIGH')) return 'up';
      if (u.includes('LOW')) return 'down';
      return null;
    }
    if (type === 'risk') {
      if (u.includes('HIGH')) return 'up';
      if (u.includes('LOW')) return 'down';
      if (u.includes('MEDIUM')) return 'down';
      return null;
    }
    return null;
  }

  /** Resolved color for Current Health (Fair = orange, etc.). */
  getCurrentHealthColor(value: string | undefined | null): string {
    const badge = this.getHeaderMetricBadgeClass(value, 'health');
    if (badge === 'badge-status-success') return 'var(--color-green, #10b981)';
    if (badge === 'badge-status-warning') return 'var(--color-orange, #f59e0b)';
    if (badge === 'badge-status-danger') return 'var(--color-red, #dc2626)';
    return 'rgba(255, 255, 255, 0.65)';
  }

  /** Health / impact badge: show only Low / High / Medium / Unknown (strip extra text, title case) */
  getHealthOrImpactBadgeLabel(value: string | undefined | null): string {
    if (!value) return 'Unknown';
    const s = String(value).trim();
    const dash = s.indexOf(' - ');
    const short = dash >= 0 ? s.slice(0, dash).trim() : s;
    const upper = short.toUpperCase();
    if (upper === 'LOW' || upper.includes('LOW')) return 'Low';
    if (upper === 'HIGH' || upper.includes('HIGH')) return 'High';
    if (upper === 'MEDIUM' || upper.includes('MEDIUM')) return 'Medium';
    if (upper === 'UNKNOWN' || upper.includes('UNKNOWN')) return 'Unknown';
    return 'Unknown';
  }

  /** Citizen impact badge: show only LOW / HIGH / MEDIUM / UNKNOWN */
  getCitizenImpactBadgeLabel(value: string | undefined | null): string {
    return this.getHealthOrImpactBadgeLabel(value);
  }

  getBadgeColor(
    value: string | undefined | null,
    type: 'citizenImpact' | 'health' | 'risk',
  ): string {
    if (!value) return 'var(--color-bg-quaternary)';

    const upperValue = value.toUpperCase();

    // Check for unknown status
    if (upperValue.includes('UNKNOWN') || upperValue.includes('N/A')) {
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'citizenImpact') {
      if (upperValue.includes('LOW')) return 'var(--color-green-light)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow-light)';
      if (upperValue.includes('HIGH')) return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'health') {
      // Same as citizen impact / risk: LOW=green, MEDIUM=yellow, HIGH=red, UNKNOWN=default
      if (upperValue.includes('LOW')) return 'var(--color-green-light)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow-light)';
      if (upperValue.includes('HIGH')) return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'risk') {
      if (upperValue.includes('LOW')) return 'var(--color-green-light)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow-light)';
      if (upperValue.includes('HIGH')) return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    return 'var(--color-bg-quaternary)';
  }

  getBadgeTextColor(
    value: string | undefined | null,
    type: 'citizenImpact' | 'health' | 'risk',
  ): string {
    if (!value) return 'var(--color-text-tertiary)';

    const upperValue = value.toUpperCase();

    // Check for unknown status
    if (upperValue.includes('UNKNOWN') || upperValue.includes('N/A')) {
      return 'var(--color-text-tertiary)';
    }

    if (type === 'citizenImpact') {
      if (upperValue.includes('LOW')) return 'var(--color-green-dark)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow)';
      if (upperValue.includes('HIGH')) return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    if (type === 'health') {
      // Same as citizen impact / risk: LOW=green, MEDIUM=yellow, HIGH=red, UNKNOWN=default
      if (upperValue.includes('LOW')) return 'var(--color-green-dark)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow)';
      if (upperValue.includes('HIGH')) return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    if (type === 'risk') {
      if (upperValue.includes('LOW')) return 'var(--color-green-dark)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow)';
      if (upperValue.includes('HIGH')) return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    return 'var(--color-text-tertiary)';
  }

  getBadgeClass(badgeColor?: string): string {
    if (!badgeColor) return 'badge-success';

    // Extract color name from CSS variable to determine badge class
    if (badgeColor.includes('green')) return 'badge-success';
    if (badgeColor.includes('red')) return 'badge-danger';
    if (badgeColor.includes('yellow')) return 'badge-warning';

    return 'badge-success';
  }

  getStatusBoxClass(status: string | undefined | null): string {
    if (!status) return 'bg-light border border-secondary';

    const upperStatus = status.toUpperCase();
    if (upperStatus.includes('DOWN') || upperStatus.includes('OFFLINE')) {
      return 'bg-danger-subtle border border-danger';
    }
    if (upperStatus.includes('UP') || upperStatus.includes('ONLINE')) {
      return 'bg-success-subtle border border-success';
    }
    return 'bg-light border border-secondary';
  }

  getStatusTextClass(status: string | undefined | null): string {
    if (!status) return 'text-secondary';

    const upperStatus = status.toUpperCase();
    if (upperStatus.includes('DOWN') || upperStatus.includes('OFFLINE')) {
      return 'text-danger';
    }
    if (upperStatus.includes('UP') || upperStatus.includes('ONLINE')) {
      return 'text-success';
    }
    return 'text-secondary';
  }

  // Action Methods
  onAnalyze() {
    this.router.navigate(['/asset-control-panel'], {
      queryParams: {
        assetId: this.assetId != null ? this.assetId.toString() : '',
      },
    });
  }

  onEdit() {
    if (this.assetId == null) return;
    this.router.navigate(['/edit-digital-asset'], {
      queryParams: { assetId: this.assetId },
    });
  }

  /** Trigger manual check for all KPIs of this asset (GET KpisLov/manual-from-asset/{assetId}/check-all). */
  onCheckCurrentStatus(): void {
    if (this.assetId == null) {
      this.utils.showToast(null, 'Asset ID is missing.', 'error');
      return;
    }
    this.apiService.checkAllKpisFromAsset(this.assetId).subscribe({
      next: (res) => {
        if (res?.isSuccessful) {
          this.utils.showToast(null, res?.message ?? 'Current status check triggered successfully.', 'success');
          this.loadAssetDashboard();
        } else {
          this.utils.showToast(null, res?.message ?? 'Check failed.', 'error');
        }
      },
      error: (err) => {
        this.utils.showToast(err, 'Failed to check current status.');
      },
    });
  }

  /** Toggle favorite (Watchlist) – same as Dashboard: add/remove and update state from API response. */
  toggleFavorite(): void {
    if (this.assetId == null) {
      this.utils.showToast('Asset ID is missing.', 'Watchlist', 'warning');
      return;
    }
    const isFavorite = this.assetDetails.favorite;
    const request$ = isFavorite
      ? this.apiService.removeAssetFromFavorites(this.assetId)
      : this.apiService.addAssetToFavorites(this.assetId);

    request$.subscribe({
      next: (res: ApiResponse<any>) => {
        if (res?.isSuccessful) {
          this.assetDetails.favorite = !isFavorite;
          this.utils.showToast(
            isFavorite ? 'Removed from Watchlist.' : 'Added to Watchlist.',
            'Watchlist',
            'success',
          );
        } else {
          this.utils.showToast(
            res?.message ?? (isFavorite ? 'Could not remove from Watchlist.' : 'Could not add to Watchlist.'),
            'Watchlist',
            'error',
          );
        }
      },
      error: (err) => {
        this.utils.showToast(err?.message ?? (isFavorite ? 'Could not remove from Watchlist.' : 'Could not add to Watchlist.'), 'Watchlist', 'error');
      },
    });
  }
}
