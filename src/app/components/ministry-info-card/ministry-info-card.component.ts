import { Component, OnInit } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import {
  ApiResponse,
  ApiService,
  AssetDistributionData,
  AssetDistributionVendor,
  CommonLookupItem,
  MinistryServiceItem as ApiMinistryServiceItem,
  MinistryServicesResponseData,
} from '../../services/api.service';

interface SummaryStat {
  label: string;
  value: string;
  isAlert?: boolean;
}

interface AssetRow {
  id: number;
  asset: string;
  category: string;
  department: string;
  hostingVendor: string;
  hostingType: string;
  hostingTypeClass: 'hosting-pill--onprem' | 'hosting-pill--cloud' | 'hosting-pill--vendor' | 'hosting-pill--default';
  devVendor: string;
  statusName: string;
  websiteStatusKey: 'verified' | 'discovered' | 'retired' | 'suspended' | 'other';
  status: 'online' | 'offline' | 'warning';
  health: string;
  performance: string;
  compliance: string;
  openIncidents: number;
  severity: string;
  favorite?: boolean;
  successRate?: string;
  failureRate?: string;
  abandonedRate?: string;
  totalOccurrences?: string;
}

interface HostingDistributionRow {
  type: string;
  count: number;
  width: number;
  colorClass: string;
}

interface VendorDistributionRow {
  vendor: string;
  type: string;
  typeClass: 'vendor-type--govt' | 'vendor-type--private' | 'vendor-type--default';
  assets: number;
  digitalMaturityText: string;
}

interface MinistryAssetSummary {
  ministryName: string;
  address: string;
  logo: string;
  totalAssets: number;
  totalWebsites: number;
  totalWebApps: number;
  totalMobileApps: number;
  totalServices: number;
  digitalMaturityLevel: string;
  totalIncidents: number;
  openIncidents: number;
  highSeverityOpenIncidents: number;
}

interface MinistryAssetListItem {
  id: number;
  assetId?: number;
  department?: string;
  websiteApplication?: string;
  assetUrl?: string;
  currentStatus?: string;
  statusName?: string;
  assetLifecycleStatus?: string;
  assetStatusName?: string;
  assetStatus?: string;
  verificationStatus?: string;
  discoveryStatus?: string;
  healthStatus?: string;
  performanceStatus?: string;
  complianceStatus?: string;
  developmentVendorName?: string | null;
  managingVendorName?: string | null;
  hostingTypeName?: string | null;
  hostingClassification?: string | null;
  hostingType?: string | null;
  openIncidents?: number;
  highSeverityIncidents?: number;
  favorite?: boolean;
  successRate?: string | null;
  failureRate?: string | null;
  abandonedRate?: string | null;
  totalOccurrences?: number | null;
}

interface ServiceCardRow {
  id: number;
  serviceName: string;
  serviceType: string;
  serviceMode: string;
  status: 'Active' | 'Inactive';
  digitalMaturityValue: number | null;
  digitalMaturityText: string;
  assetsCount: number;
  stepsCount: number;
  createdAt: string;
  createdBy: string;
}

@Component({
  selector: 'app-ministry-info-card',
  templateUrl: './ministry-info-card.component.html',
  styleUrl: './ministry-info-card.component.scss',
  standalone: false,
})
export class MinistryInfoCardComponent implements OnInit {
  websiteCount = '{{websiteCount}}';
  webAppCount = '{{webAppCount}}';
  mobileAppCount = '{{mobileAppCount}}';
  servicesCount = '{{servicesCount}}';
  openIncidentsCount = '{{openIncidentsCount}}';
  highSeverityCount = '{{highSeverityCount}}';

  ministryName = 'Ministry Name';
  ministryAddress = 'Address';
  digitalMaturity = '{{digitalMaturityLevel}}';
  ministryLogoUrl = '';
  loading = false;
  loadingAssets = false;
  errorMessage = '';
  ministryId: number | null = null;

  readonly tabs = ['Websites', 'Web Apps', 'Mobile Apps', 'Services'];
  activeTab = 'Websites';

  get summaryStats(): SummaryStat[] {
    return [
      { label: 'Websites', value: this.websiteCount },
      { label: 'Web Apps', value: this.webAppCount },
      { label: 'Mobile Apps', value: this.mobileAppCount },
      { label: 'Services', value: this.servicesCount },
      { label: 'Open Incidents', value: this.openIncidentsCount, isAlert: true },
      { label: 'High Severity', value: this.highSeverityCount, isAlert: true },
    ];
  }

  assetRows: AssetRow[] = [];
  serviceRows: ServiceCardRow[] = [];
  private assetTypeIdsByTab: Partial<Record<string, number>> = {};
  pageSizeOptions = [10, 25, 50];
  pageSize = 10;
  pageIndex = 0;
  searchQuery = '';
  sortColumn: keyof AssetRow = 'asset';
  sortDirection: 'asc' | 'desc' = 'asc';

  hostingDistribution: HostingDistributionRow[] = [
    { type: 'On-Premises', count: 5, width: 76, colorClass: 'bar-red' },
    { type: 'Cloud (Private)', count: 4, width: 62, colorClass: 'bar-blue' },
    { type: 'Vendor-Hosted', count: 3, width: 48, colorClass: 'bar-cyan' },
  ];

  vendorDistribution: VendorDistributionRow[] = [
    { vendor: 'Mercurial Minds', type: 'Govt. Entity', typeClass: 'vendor-type--govt', assets: 7, digitalMaturityText: 'N/A' },
    { vendor: 'NTC (PTCL)', type: 'Private Entity', typeClass: 'vendor-type--private', assets: 5, digitalMaturityText: 'N/A' },
    { vendor: 'Nayatel Cloud', type: 'Private Entity', typeClass: 'vendor-type--private', assets: 4, digitalMaturityText: 'N/A' },
  ];

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const raw = params['ministryId'];
      const parsed = Number(raw);
      this.ministryId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      if (!this.ministryId) {
        this.errorMessage = 'Valid ministryId is required.';
        return;
      }
      this.loadMinistrySummary(this.ministryId);
      this.loadAssetTypeLookups(this.ministryId);
      this.loadAssetDistribution(this.ministryId);
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.resetTableState();
    if (this.ministryId) {
      this.loadAssetsForActiveTab(this.ministryId);
    }
  }

  getStatusLabel(status: AssetRow['status']): string {
    if (status === 'online') return 'Online';
    if (status === 'warning') return 'Warning';
    return 'Offline';
  }

  isExperienceTab(): boolean {
    return (
      this.activeTab === 'Web Apps' ||
      this.activeTab === 'Mobile Apps' ||
      this.activeTab === 'Services'
    );
  }

  pagedAssetRows(): AssetRow[] {
    const sorted = this.getSortedAssetRows();
    const start = this.pageIndex * this.pageSize;
    return sorted.slice(start, start + this.pageSize);
  }

  totalAssetRows(): number {
    return this.getFilteredAssetRows().length;
  }

  onSearchQueryChange(value: string): void {
    this.searchQuery = value ?? '';
    this.pageIndex = 0;
  }

  paginationStart(): number {
    if (this.totalAssetRows() === 0) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  paginationEnd(): number {
    const end = (this.pageIndex + 1) * this.pageSize;
    return Math.min(end, this.totalAssetRows());
  }

  canPrevPage(): boolean {
    return this.pageIndex > 0;
  }

  canNextPage(): boolean {
    return this.paginationEnd() < this.totalAssetRows();
  }

  onPageChange(delta: number): void {
    const targetPage = this.pageIndex + delta;
    if (targetPage < 0) return;
    const maxPage = Math.max(Math.ceil(this.totalAssetRows() / this.pageSize) - 1, 0);
    this.pageIndex = Math.min(targetPage, maxPage);
  }

  onPageSizeChange(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    this.pageSize = parsed;
    this.pageIndex = 0;
  }

  onSort(column: keyof AssetRow): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }

  getSortIndicator(column: keyof AssetRow): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  private loadMinistrySummary(ministryId: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.apiService.getMinistryDetailById(ministryId).subscribe({
      next: (response: ApiResponse<MinistryAssetSummary>) => {
        this.loading = false;
        if (!response?.isSuccessful || !response?.data) {
          this.errorMessage = response?.message ?? 'Failed to load ministry summary.';
          return;
        }
        this.applySummaryResponse(response.data);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Error loading ministry summary.';
      },
    });
  }

  private loadAssetTypeLookups(ministryId: number): void {
    this.apiService.getCommonLookupByType('assetType').subscribe({
      next: (response: ApiResponse<CommonLookupItem[]>) => {
        const lookups = response?.data ?? [];
        this.assetTypeIdsByTab = {
          Websites: this.findLookupIdByName(lookups, 'website'),
          'Web Apps': this.findLookupIdByName(lookups, 'web app'),
          'Mobile Apps': this.findLookupIdByName(lookups, 'mobile app'),
          Services: this.findLookupIdByName(lookups, 'service'),
        };
        this.loadAssetsForActiveTab(ministryId);
      },
      error: () => {
        this.errorMessage = 'Unable to load asset type lookup.';
      },
    });
  }

  private loadAssetsForActiveTab(ministryId: number): void {
    if (this.activeTab === 'Services') {
      this.loadServicesForTab(ministryId);
      return;
    }

    const assetTypeId = this.assetTypeIdsByTab[this.activeTab];
    if (!assetTypeId) {
      this.assetRows = [];
      this.serviceRows = [];
      return;
    }

    this.loadingAssets = true;
    const params = new HttpParams().set('AssetTypeId', String(assetTypeId));
    this.apiService.getAssestByMinistry(params, ministryId).subscribe({
      next: (response: ApiResponse<any>) => {
        this.loadingAssets = false;
        this.serviceRows = [];
        const rows = response?.data?.data ?? [];
        this.assetRows = Array.isArray(rows)
          ? rows.map((item: MinistryAssetListItem) => this.mapAssetRow(item))
          : [];
        this.pageIndex = 0;
      },
      error: () => {
        this.loadingAssets = false;
        this.assetRows = [];
        this.errorMessage = 'Unable to load assets for selected tab.';
      },
    });
  }

  private loadServicesForTab(ministryId: number): void {
    this.loadingAssets = true;
    this.apiService.getServicesByMinistry(ministryId).subscribe({
      next: (response: ApiResponse<MinistryServicesResponseData>) => {
        this.loadingAssets = false;
        const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
        this.serviceRows = rows.map((item) => this.mapServiceToCardRow(item));
        this.assetRows = [];
        this.pageIndex = 0;
      },
      error: () => {
        this.loadingAssets = false;
        this.assetRows = [];
        this.serviceRows = [];
        this.errorMessage = 'Unable to load services for selected tab.';
      },
    });
  }

  private loadAssetDistribution(ministryId: number): void {
    this.apiService.getAssetDistributionByMinistry(ministryId).subscribe({
      next: (response: ApiResponse<AssetDistributionData>) => {
        if (!response?.isSuccessful || !response?.data) return;
        const distribution = response.data;
        this.hostingDistribution = this.mapHostingDistribution(distribution);
        this.vendorDistribution = this.mapVendorDistribution(distribution.vendorDistribution);
      },
    });
  }

  private applySummaryResponse(data: MinistryAssetSummary): void {
    this.ministryName = data.ministryName || 'Ministry Name';
    this.ministryAddress = data.address || 'Address';
    this.digitalMaturity = data.digitalMaturityLevel || '{{digitalMaturityLevel}}';
    this.websiteCount = this.toDisplayValue(data.totalWebsites, '{{websiteCount}}');
    this.webAppCount = this.toDisplayValue(data.totalWebApps, '{{webAppCount}}');
    this.mobileAppCount = this.toDisplayValue(data.totalMobileApps, '{{mobileAppCount}}');
    this.servicesCount = this.toDisplayValue(data.totalServices, '{{servicesCount}}');
    this.openIncidentsCount = this.toDisplayValue(data.openIncidents, '{{openIncidentsCount}}');
    this.highSeverityCount = this.toDisplayValue(
      data.highSeverityOpenIncidents,
      '{{highSeverityCount}}',
    );
    this.ministryLogoUrl = this.resolveLogoUrl(data.logo);
  }

  private mapAssetRow(item: MinistryAssetListItem): AssetRow {
    const statusName =
      item.statusName?.trim() ||
      item.assetLifecycleStatus?.trim() ||
      item.assetStatusName?.trim() ||
      item.assetStatus?.trim() ||
      item.verificationStatus?.trim() ||
      item.discoveryStatus?.trim() ||
      item.currentStatus?.trim() ||
      'N/A';
    const rawHostingType =
      item.hostingTypeName?.trim() ||
      item.hostingClassification?.trim() ||
      item.hostingType?.trim() ||
      'N/A';
    const hostingType = this.normalizeHostingTypeLabel(rawHostingType);

    return {
      id: Number(item.id ?? item.assetId ?? 0),
      asset: item.websiteApplication?.trim() || 'N/A',
      category: item.assetUrl?.trim() || 'N/A',
      department: item.department?.trim() || 'N/A',
      hostingVendor: item.managingVendorName?.trim() || 'N/A',
      hostingType,
      hostingTypeClass: this.getHostingTypeClass(hostingType),
      devVendor: item.developmentVendorName?.trim() || 'N/A',
      statusName,
      websiteStatusKey: this.getWebsiteStatusKey(statusName),
      status: this.mapStatus(item.currentStatus),
      health: item.healthStatus?.trim() || 'N/A',
      performance: item.performanceStatus?.trim() || 'N/A',
      compliance: item.complianceStatus?.trim() || 'N/A',
      openIncidents: item.openIncidents ?? 0,
      severity: String(item.highSeverityIncidents ?? 0),
      favorite: !!item.favorite,
      successRate: this.toPercentDisplay(item.successRate),
      failureRate: this.toPercentDisplay(item.failureRate),
      abandonedRate: this.toPercentDisplay(item.abandonedRate),
      totalOccurrences: this.toCountDisplay(item.totalOccurrences),
    };
  }

  private getHostingTypeClass(
    hostingType: string,
  ): 'hosting-pill--onprem' | 'hosting-pill--cloud' | 'hosting-pill--vendor' | 'hosting-pill--default' {
    const normalized = hostingType.trim().toLowerCase();
    if (normalized.includes('on-prem') || normalized.includes('on premise') || normalized.includes('onprem')) {
      return 'hosting-pill--onprem';
    }
    if (normalized.includes('cloud')) {
      return 'hosting-pill--cloud';
    }
    if (normalized.includes('vendor') || normalized.includes('private')) {
      return 'hosting-pill--vendor';
    }
    return 'hosting-pill--default';
  }

  private normalizeHostingTypeLabel(hostingType: string): string {
    const normalized = hostingType.trim().toLowerCase();
    if (normalized === 'private') return 'Vendor-Hosted';
    if (normalized === 'cloud') return 'Cloud (Private)';
    return hostingType;
  }

  private getWebsiteStatusKey(
    statusName: string,
  ): 'verified' | 'discovered' | 'retired' | 'suspended' | 'other' {
    const normalized = statusName.trim().toLowerCase();
    if (normalized.includes('verified')) return 'verified';
    if (normalized.includes('discovered')) return 'discovered';
    if (normalized.includes('retired') || normalized.includes('retierd')) return 'retired';
    if (normalized.includes('suspended') || normalized.includes('suspanded')) return 'suspended';
    return 'other';
  }

  onAnalyzeAsset(assetId: number): void {
    if (!assetId) return;
    this.router.navigate(['/asset-control-panel'], {
      queryParams: { assetId },
    });
  }

  onAssetNameClick(assetId: number): void {
    if (!assetId) return;
    this.router.navigate(['/view-assets-detail'], {
      queryParams: {
        id: assetId,
        ministryId: this.ministryId ?? '',
      },
    });
  }

  toggleFavorite(row: AssetRow): void {
    const assetId = row.id;
    if (!assetId) return;

    const isFavorite = !!row.favorite;
    const request$ = isFavorite
      ? this.apiService.removeAssetFromFavorites(assetId)
      : this.apiService.addAssetToFavorites(assetId);

    request$.subscribe({
      next: (response) => {
        if (!response?.isSuccessful) {
          this.errorMessage =
            response?.message ??
            (isFavorite
              ? 'Could not remove from Watchlist.'
              : 'Could not add to Watchlist.');
          return;
        }

        this.errorMessage = '';
        row.favorite = !isFavorite;
      },
      error: () => {
        this.errorMessage = isFavorite
          ? 'Could not remove from Watchlist.'
          : 'Could not add to Watchlist.';
      },
    });
  }

  private mapServiceToCardRow(item: ApiMinistryServiceItem): ServiceCardRow {
    const mode = String(item.serviceModeName ?? '').toLowerCase();
    const isActive = item.isActive ?? (mode.includes('digital') || mode.includes('automated'));
    const maturityRaw = String(item.digitalServicePercentage ?? '').trim();
    const maturityNumber = Number(maturityRaw.replace('%', '').trim());
    const hasMaturity = maturityRaw !== '' && Number.isFinite(maturityNumber);

    return {
      id: Number(item.id ?? 0),
      serviceName: item.serviceName ?? 'N/A',
      serviceType: item.serviceTypeName ?? 'N/A',
      serviceMode: item.serviceModeName ?? 'N/A',
      status: isActive ? 'Active' : 'Inactive',
      digitalMaturityValue: hasMaturity ? Math.max(0, Math.min(100, maturityNumber)) : null,
      digitalMaturityText: hasMaturity ? `${Math.max(0, Math.min(100, maturityNumber))}%` : 'N/A',
      assetsCount: Number(item.assetCount ?? 0),
      stepsCount: Number(item.stepCount ?? 0),
      createdAt: this.formatDate(item.createdAt),
      createdBy: item.createdBy ?? 'N/A',
    };
  }

  private mapStatus(status: string | null | undefined): AssetRow['status'] {
    const normalized = (status ?? '').trim().toLowerCase();
    if (normalized === 'online') return 'online';
    if (normalized === 'offline') return 'offline';
    return 'warning';
  }

  private findLookupIdByName(lookups: CommonLookupItem[], lookupName: string): number | undefined {
    const normalizedName = lookupName.toLowerCase();
    return lookups.find((item) => item.name?.toLowerCase().includes(normalizedName))?.id;
  }

  private toPercentDisplay(value: string | null | undefined): string {
    if (!value || value.trim() === '') return 'N/A';
    return value.includes('%') ? value : `${value}%`;
  }

  private toCountDisplay(value: number | null | undefined): string {
    return value == null ? 'N/A' : String(value);
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-GB');
  }

  private mapHostingDistribution(data: AssetDistributionData): HostingDistributionRow[] {
    const hosting = data.hostingDistribution;
    const total = Number(hosting?.totalAssets ?? 0);
    const pct = (count: number): number => {
      if (!total || total <= 0) return 0;
      return Math.max(0, Math.min(100, Math.round((count / total) * 100)));
    };

    return [
      {
        type: 'On-Premises',
        count: Number(hosting?.onPremise ?? 0),
        width: pct(Number(hosting?.onPremise ?? 0)),
        colorClass: 'bar-red',
      },
      {
        type: 'Cloud (Private)',
        count: Number(hosting?.cloud ?? 0),
        width: pct(Number(hosting?.cloud ?? 0)),
        colorClass: 'bar-blue',
      },
      {
        type: 'Vendor-Hosted',
        count: Number(hosting?.private ?? 0),
        width: pct(Number(hosting?.private ?? 0)),
        colorClass: 'bar-cyan',
      },
    ];
  }

  private mapVendorDistribution(vendors: AssetDistributionVendor[] | null | undefined): VendorDistributionRow[] {
    if (!Array.isArray(vendors)) return [];
    return vendors.map((v) => ({
      vendor: v.vendorName || 'N/A',
      type: v.vendorType || 'N/A',
      typeClass: this.getVendorTypeClass(v.vendorType || 'N/A'),
      assets: Number(v.totalAssetsManaged ?? 0),
      digitalMaturityText: 'N/A',
    }));
  }

  private getVendorTypeClass(
    type: string,
  ): 'vendor-type--govt' | 'vendor-type--private' | 'vendor-type--default' {
    const normalized = type.trim().toLowerCase();
    if (normalized.includes('govt') || normalized.includes('government')) return 'vendor-type--govt';
    if (normalized.includes('private')) return 'vendor-type--private';
    return 'vendor-type--default';
  }

  private resetTableState(): void {
    this.pageIndex = 0;
    this.sortColumn = 'asset';
    this.sortDirection = 'asc';
  }

  private getSortedAssetRows(): AssetRow[] {
    const rows = [...this.getFilteredAssetRows()];
    const column = this.sortColumn;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return rows.sort((a, b) => this.compareValues(a[column], b[column]) * dir);
  }

  private getFilteredAssetRows(): AssetRow[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.assetRows;
    return this.assetRows.filter((row) => {
      return (
        row.asset.toLowerCase().includes(query) ||
        row.category.toLowerCase().includes(query) ||
        row.department.toLowerCase().includes(query) ||
        row.hostingVendor.toLowerCase().includes(query) ||
        row.devVendor.toLowerCase().includes(query)
      );
    });
  }

  private compareValues(a: unknown, b: unknown): number {
    const na = this.toComparableNumber(a);
    const nb = this.toComparableNumber(b);
    if (na != null && nb != null) return na - nb;
    const sa = String(a ?? '').toLowerCase();
    const sb = String(b ?? '').toLowerCase();
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return 0;
  }

  private toComparableNumber(value: unknown): number | null {
    if (typeof value === 'number') return value;
    const str = String(value ?? '').trim();
    if (!str || str.toLowerCase() === 'n/a') return null;
    const normalized = str.replace('%', '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  onEditService(serviceId: number): void {
    if (!this.ministryId || !serviceId) return;
    this.router.navigate(['/service-detail'], {
      queryParams: {
        ministryId: this.ministryId,
        serviceId,
        mode: 'edit',
      },
    });
  }

  onOpenService(serviceId: number): void {
    if (!this.ministryId || !serviceId) return;
    this.router.navigate(['/service-detail'], {
      queryParams: {
        ministryId: this.ministryId,
        serviceId,
      },
    });
  }

  private toDisplayValue(value: number | null | undefined, fallback: string): string {
    return value == null ? fallback : String(value);
  }

  private resolveLogoUrl(logoPath: string | null | undefined): string {
    if (!logoPath) return '';
    if (/^https?:\/\//i.test(logoPath)) return logoPath;
    const cleanedLogoPath = logoPath.replace(/^\/+/, '');
    try {
      const apiBase = new URL(this.apiService.baseUrl);
      // Logo files are served from server root (without API port/path).
      return `${apiBase.protocol}//${apiBase.hostname}/${cleanedLogoPath}`;
    } catch {
      return cleanedLogoPath;
    }
  }
}
