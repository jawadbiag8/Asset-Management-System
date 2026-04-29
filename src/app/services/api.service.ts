import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { DigitalAssetRequest } from '../components/manage-digital-assets/manage-digital-assets.component';
import { ActiveIncident } from '../components/incidents/active-incidents/active-incidents.component';
import { IncidentRequest } from '../components/incidents/manage-incidents/manage-incidents.component';
import { DigitalAsset } from '../components/dashboard/dashboard.component';
import { AssetControlPanelData } from '../components/assets/asset-control-panel/asset-control-panel.component';
import { UtilsService } from './utils.service';

export interface ApiResponse<T = any> {
  isSuccessful: boolean;
  data?: T;
  message?: string | null;
}

/** Single row error from bulk upload API when validation fails. */
export interface BulkUploadErrorRow {
  rowNumber: number;
  assetName: string;
  errorMessage: string;
}

/** Bulk upload response data when isSuccessful is false. */
export interface BulkUploadErrorData {
  totalRows: number;
  successfulCount: number;
  failedCount: number;
  errors: BulkUploadErrorRow[];
}

export interface LoginData {
  token: string;
  name: string;
  roles: string[];
}

/** Single item from GET Asset/{assetId}/history */
export interface AssetHistoryItem {
  id: number;
  userName: string;
  createdAt: string;
  createdBy: string;
  refId: string;
  path: string;
  changes: Record<string, unknown>;
}

/** Contact item for PUT Asset/{id} body (edit asset). */
export interface AssetContactItem {
  ContactName: string;
  ContactTitle: string;
  ContactNumber: string;
  ContactEmail: string;
  Type: 'Business' | 'Technical';
}

/** PUT Asset/{id} request body (edit asset – RefId, Path, Contacts). */
export interface AssetUpdatePutRequest {
  ministryId?: number;
  departmentId?: number;
  assetName?: string;
  assetUrl?: string;
  description?: string;
  citizenImpactLevelId?: number;
  statusId?: number;
  assetTypeId?: number;
  hostingTypeId?: number;
  developmentVendorId?: number;
  managingVendorId?: number;
  RefId: string;
  Path: string;
  Contacts: AssetContactItem[];
}

/** POST /api/Asset request body (add asset) – matches API: contacts[] with camelCase. */
export interface AddAssetApiRequest {
  ministryId: number;
  departmentId?: number;
  assetName: string;
  assetUrl: string;
  citizenImpactLevelId: number;
  description: string;
  assetTypeId?: number;
  hostingTypeId?: number;
  developmentVendorId?: number;
  managingVendorId?: number;
  refId?: string;
  path?: string;
  contacts: {
    contactName: string;
    contactTitle: string;
    contactEmail: string;
    contactNumber: string;
    type: 'Business' | 'Technical';
  }[];
}

export interface AddDepartmentApiRequest {
  ministryId: number;
  departmentName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface UpdateDepartmentApiRequest {
  ministryId: number;
  departmentName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface UpsertMinistryApiRequest {
  ministryName: string;
  contactName: string;
  contactDesignation: string;
  contactEmail: string;
  contactPhone: string;
  /** Optional – include when API supports on PUT */
  address?: string;
  description?: string;
}

/** POST /Ministry – multipart/form-data (create ministry + logo + reference file). */
export interface CreateMinistryMultipartRequest {
  ministryName: string;
  /** Optional; send empty string if not collected in UI */
  address?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactDesignation: string;
  refId: string;
  /** Reference document from upload dialog – field name `file` (matches API curl). */
  file: File;
  /** Ministry logo from main form – field name `logo` (images). Optional. */
  logo?: File | null;
  description?: string;
}

/** Single item from GET Ministry/{ministryId}/history (audit log) */
export interface MinistryHistoryItem {
  id: number;
  userName: string;
  createdAt: string;
  createdBy: string;
  refId: string;
  path: string;
  changes: Record<string, unknown>;
}

/** Single item from GET Ministry/{ministryId}/correspondence */
export interface MinistryCorrespondenceItem {
  id: number;
  ministryId: number;
  ministryName: string;
  status: string;
  reportPath?: string;
  refId?: string | null;
  refPath?: string | null;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MinistryServiceSummary {
  totalServices: number;
  totalMappedAssetsCount: number;
  overallSuccessRate: string;
  digitalServicePercentage: string;
}

export interface MinistryServiceItem {
  id: number;
  ministryId: number;
  ministryName: string;
  serviceName: string;
  description?: string;
  serviceTypeId?: number;
  serviceTypeName?: string;
  serviceModeId?: number;
  serviceModeName?: string;
  assetIds?: number[];
  assetCount?: number;
  stepCount?: number;
  digitalServicePercentage?: string;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MinistryServicesResponseData {
  summary?: MinistryServiceSummary;
  data?: MinistryServiceItem[];
  totalCount?: number;
  pageNumber?: number;
  pageSize?: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface CreateServiceManualStep {
  stepName: string;
  description: string;
}

export interface CreateServiceRequest {
  ministryId: number;
  serviceName: string;
  description: string;
  serviceTypeId: number;
  assetIds: number[];
  manualSteps: CreateServiceManualStep[];
}

/** GET /Service/{id} — full service detail with steps and metrics. */
export interface ServiceSummary {
  totalForms: number;
  linkedAssets: number;
  totalOccurrences: number;
  successRate: string;
  digitalPercentage: string;
}

export interface ServiceStepMetricByAsset {
  assetId: number;
  assetName: string;
  occurrences: number;
  successRate: string;
}

export interface ServiceStepMetrics {
  overallOccurrences: number;
  startedCount: number;
  submittedCount: number;
  completionRate: string;
  avgTimeMs: string;
  overallSuccessRate: string;
  lastEventAt: string | null;
  byAsset: ServiceStepMetricByAsset[];
}

export interface ServiceStepItem {
  id: number;
  stepName: string;
  description?: string;
  /** Present when API returns step ordering (edit / placement). */
  displayOrder?: number;
  isManual: boolean;
  metrics: ServiceStepMetrics;
}

export interface ServiceDetailAsset {
  assetId: number;
  assetName: string;
  assetUrl: string;
}

export interface ServiceDetailData {
  summary: ServiceSummary;
  id: number;
  isActive: boolean;
  ministryId: number;
  ministryName: string;
  serviceName: string;
  description?: string;
  serviceTypeId?: number;
  serviceTypeName?: string;
  serviceModeId?: number;
  serviceModeName?: string;
  assetIds?: number[];
  assets?: ServiceDetailAsset[];
  steps: ServiceStepItem[];
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/** GET /Service/{id}/steps/{stepName}/events/metrics */
export interface ServiceStepEventMetricRow {
  eventName: string;
  totalOccurrences: number;
  startedCount: number;
  submittedCount: number;
  avgTimeMs: string;
  successRate: string;
}

export interface ServiceStepEventMetricsData {
  stepName: string;
  byEventName?: ServiceStepEventMetricRow[];
  byEventType?: ServiceStepEventMetricRow[];
}

export interface ServiceSubmissionTrendPoint {
  date: string;
  success: number;
  failure: number;
}

export interface ServiceTrafficTrendPoint {
  date: string;
  occurrences: number;
}

export interface ServiceAnalyticsData {
  id: number;
  serviceName: string;
  ministryName: string;
  ministryId: number;
  assetMappedCount: number;
  cdms: string;
  adoption?: number;
  adoptionCount?: number;
  adoptionPercentage?: string;
  adoptionTrend?: string;
  reliability: string;
  efficiency: string;
  availability: string;
  submissionEventsTrend: ServiceSubmissionTrendPoint[];
  trafficTrend: ServiceTrafficTrendPoint[];
}

/** GET /Service/{id}/steps/order-limits */
export interface ServiceStepOrderLimitsData {
  mergedStepCount: number;
  minDisplayOrder: number;
  maxAvailableDisplayOrder: number;
}

/** GET /Service/validate-name-unique */
export interface ValidateServiceNameUniqueData {
  ministryId: number;
  serviceName: string;
  normalizedServiceName?: string;
  isUnique: boolean;
}

/** POST /Service/{id}/steps — add manual step(s) */
export interface PostServiceManualStepItem {
  stepName: string;
  description: string;
  displayOrder: number;
}

export interface PostServiceStepsRequest {
  steps: PostServiceManualStepItem[];
}

/** PUT /Service/{serviceId}/steps/{stepId} */
export interface PutServiceStepRequest {
  stepName: string;
  description: string;
  displayOrder: number;
}
export interface VendorOffering {
  id: number;
  name: string;
}

export interface VendorListItem {
  id: number;
  vendorName: string;
  vendorWebsite: string;
  vendorTypeId: number;
  vendorTypeName: string;
  vendorStatusId: number;
  vendorStatusName: string;
  offerings?: VendorOffering[] | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface VendorSummary {
  totalVendors: number;
  totalActiveVendors: number;
  totalInactiveVendors: number;
  totalAssetsManagedByVendors: number;
  totalAssetsDevelopedByVendors: number;
  activeVendorsWithNoAssets: number;
}

export interface VendorListData {
  summary: VendorSummary;
  data: VendorListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface VendorAssetScoreItem {
  assetName: string;
  assetType: string;
  ministry: string;
  department: string;
  assetHostingType: string;
  overallScore: string;
}

export interface VendorDetailData {
  id: number;
  vendorName: string;
  vendorWebsite: string;
  vendorEmail?: string | null;
  vendorPhone?: string | null;
  vendorTypeId: number;
  vendorTypeName: string;
  vendorStatusId: number;
  vendorStatusName: string;
  linkedAsset?: number;
  linkedWebsiteCount?: number;
  linkedAppsCount?: number;
  overallHostingScore?: string;
  overallDevelopmentScore?: string;
  compositeWebsiteScore?: string;
  compossiteAppsScore?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  developedAssets: VendorAssetScoreItem[];
  hostingAssets: VendorAssetScoreItem[];
}

export interface CommonLookupItem {
  id: number;
  name: string;
}

export interface AssetDistributionHosting {
  totalAssets: number;
  onPremise: number;
  cloud: number;
  private: number;
}

export interface AssetDistributionVendor {
  vendorName: string;
  vendorType: string;
  totalAssetsManaged: number;
}

export interface AssetDistributionData {
  scope: string;
  ministryId: number | null;
  assetId: number | null;
  hostingDistribution: AssetDistributionHosting;
  vendorDistribution: AssetDistributionVendor[];
}

export interface CreateVendorRequest {
  vendorName: string;
  vendorWebsite: string;
  vendorTypeId: number;
  vendorEmail: string;
  vendorPhone: string;
  vendorStatusId?: number;
  offeringIds?: number[];
}

export interface VendorProfileSummary {
  totalAssetsLinkedDistinct: number;
  developedAssetsCount: number;
  managedAssetsCount: number;
  distinctMinistriesCount: number;
  distinctDepartmentsCount: number;
}

export interface VendorProfileAssetItem {
  assetId: number;
  assetName: string;
  assetUrl: string;
  ministryId: number | null;
  ministryName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  isDevelopmentVendor: boolean;
  isManagingVendor: boolean;
}

export interface VendorProfileAssetsData {
  data: VendorProfileAssetItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface VendorProfileData {
  summary: VendorProfileSummary;
  vendor: VendorListItem;
  assets: VendorProfileAssetsData;
}
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private utils: UtilsService,
  ) {}
  get baseUrl(): string {
    return this.utils.getEnvironmentVariable('apiUrl');
  }

  login(
    username: string,
    password: string,
  ): Observable<ApiResponse<LoginData>> {
    return this.http.post<ApiResponse<LoginData>>(
      `${this.baseUrl}/Auth/login`,
      {
        username,
        password,
      },
    );
  }

  logout(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/Auth/logout`, {});
  }

  getAllMinistries(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/Ministry/GetAll`);
  }

  getMinistries(searchQuery?: HttpParams): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Ministry`;
    return this.http.get<ApiResponse<any>>(url, { params: searchQuery });
  }

  getMinistryById(ministryId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/Ministry/${ministryId}`);
  }

  /**
   * Ministry audit / history – GET Ministry/{ministryId}/history
   */
  getMinistryHistory(ministryId: number): Observable<ApiResponse<MinistryHistoryItem[]>> {
    return this.http.get<ApiResponse<MinistryHistoryItem[]>>(
      `${this.baseUrl}/Ministry/${ministryId}/history`,
      { headers: { Accept: 'application/json' } },
    );
  }

  /**
   * Download reference document for a ministry history entry.
   * GET Ministry/history/{historyId}/download
   */
  downloadMinistryHistoryDocument(historyId: number): Observable<HttpResponse<Blob>> {
    const url = `${this.baseUrl}/Ministry/history/${historyId}/download`;
    return this.http.get(url, { responseType: 'blob', observe: 'response' });
  }

  /**
   * Create ministry – multipart/form-data (matches API: ministryName, address, contacts, refId, file).
   * Do not set Content-Type; browser sets multipart boundary.
   */
  addMinistry(payload: CreateMinistryMultipartRequest): Observable<ApiResponse<any>> {
    const fd = new FormData();
    fd.append('ministryName', payload.ministryName);
    fd.append('address', payload.address ?? '');
    fd.append('contactName', payload.contactName);
    fd.append('contactEmail', payload.contactEmail);
    fd.append('contactPhone', payload.contactPhone);
    fd.append('contactDesignation', payload.contactDesignation);
    fd.append('refId', payload.refId ?? '');
    fd.append('file', payload.file, payload.file.name);
    if (payload.logo) {
      fd.append('logo', payload.logo, payload.logo.name);
    }
    if (payload.description != null && payload.description !== '') {
      fd.append('description', payload.description);
    }
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/Ministry`, fd, {
      headers: { Accept: 'application/json' },
    });
  }

  /**
   * Update ministry – PUT multipart/form-data (matches API curl: ministryName, address, contacts, refId, file, optional logo).
   * Authorization: Bearer … is added by `ApiInterceptor`.
   */
  updateMinistry(
    ministryId: number,
    payload: CreateMinistryMultipartRequest,
  ): Observable<ApiResponse<any>> {
    const fd = new FormData();
    fd.append('ministryName', payload.ministryName);
    fd.append('address', payload.address ?? '');
    fd.append('contactName', payload.contactName);
    fd.append('contactEmail', payload.contactEmail);
    fd.append('contactPhone', payload.contactPhone);
    fd.append('contactDesignation', payload.contactDesignation);
    fd.append('refId', payload.refId ?? '');
    fd.append('file', payload.file, payload.file.name);
    if (payload.logo) {
      fd.append('logo', payload.logo, payload.logo.name);
    }
    if (payload.description != null && payload.description !== '') {
      fd.append('description', payload.description);
    }
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/Ministry/${ministryId}`, fd, {
      headers: { Accept: 'application/json' },
    });
  }

  deleteMinistry(ministryId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/Ministry/${ministryId}`, {
      headers: { Accept: 'text/plain' },
    });
  }

  /**
   * Ministry details with ministries + assets in one response.
   * Params: status (ALL|Up|Down), filterType, filterValue, pageNumber, pageSize, searchTerm (optional).
   */
  getMinistryDetails(params?: HttpParams): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/Ministry/ministrydetails`;
    return this.http.get<ApiResponse<any>>(url, { params: params ?? undefined });
  }

  /**
   * Download ministry report as PDF. Returns blob for opening in new tab or saving.
   * GET Ministry/{ministryId}/report
   */
  getMinistryReport(ministryId: number | string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/Ministry/${ministryId}/report`, {
      responseType: 'blob',
    });
  }

  /**
   * Download correspondence report (file). GET Ministry/correspondence/{id}/report
   */
  getCorrespondenceReport(correspondenceId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/Ministry/correspondence/${correspondenceId}/report`,
      { responseType: 'blob' },
    );
  }

  /**
   * Get all correspondence (recent ministries with uploaded reports).
   * GET Ministry/correspondence/getAll
   */
  getCorrespondenceAll(period?: string): Observable<ApiResponse<any[]>> {
    const options = period
      ? { params: new HttpParams().set('period', period) }
      : {};
    return this.http.get<ApiResponse<any[]>>(
      `${this.baseUrl}/Ministry/correspondence/getAll`,
      options,
    );
  }

  /**
   * Get correspondence list for a ministry.
   * GET Ministry/{ministryId}/correspondence
   */
  getMinistryCorrespondence(ministryId: number | string): Observable<ApiResponse<MinistryCorrespondenceItem[]>> {
    return this.http.get<ApiResponse<MinistryCorrespondenceItem[]>>(
      `${this.baseUrl}/Ministry/${ministryId}/correspondence`,
      { headers: { Accept: 'text/plain' } },
    );
  }

  /**
   * Dispatch correspondence: upload reference document for a ministry.
   * POST Ministry/{ministryId}/report/dispatch
   * Body: multipart/form-data with refId (string) and file (File).
   */
  dispatchCorrespondenceReport(ministryId: number | string, refId: string, file: File): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('refId', refId);
    formData.append('file', file, file.name);
    return this.http.post<ApiResponse<any>>(
      `${this.baseUrl}/Ministry/${ministryId}/report/dispatch`,
      formData,
      { headers: { Accept: 'text/plain' } },
    );
  }

  getDepartmentsByMinistry(ministryId: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(
      `${this.baseUrl}/Department/ministry/${ministryId}`,
    );
  }

  addDepartment(payload: AddDepartmentApiRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/Department`, payload, {
      headers: { Accept: 'text/plain', 'Content-Type': 'application/json' },
    });
  }

  deleteDepartment(departmentId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.baseUrl}/Department/${departmentId}`,
      { headers: { Accept: 'text/plain' } },
    );
  }

  updateDepartment(
    departmentId: number,
    payload: UpdateDepartmentApiRequest,
  ): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.baseUrl}/Department/${departmentId}`,
      payload,
      { headers: { Accept: 'text/plain', 'Content-Type': 'application/json' } },
    );
  }

  getLovByType(
    lovType:
      | 'citizenImpactLevel'
      | 'assetType'
      | 'hostingType'
      | 'SeverityLevel'
      | 'Status'
      | 'IncidentCreationFrequency'
      | 'HealthStatus'
      | 'PerformanceStatus'
      | 'ComplianceStatus'
      | 'RiskExposureIndex'
      | 'AssetStatus',
  ): Observable<ApiResponse> {
    if (lovType === 'HealthStatus') {
      return of({
        isSuccessful: true,
        data: [
          { label: 'HEALTHY', id: 'HEALTHY' },
          { label: 'FAIR', id: 'FAIR' },
          { label: 'POOR', id: 'POOR' },
          { label: 'Unknown', id: 'Unknown' },
        ],
      });
    }

    if (lovType === 'PerformanceStatus') {
      return of({
        isSuccessful: true,
        data: [
          { label: 'GOOD', id: 'GOOD' },
          { label: 'AVERAGE', id: 'AVERAGE' },
          { label: 'BELOW AVERAGE', id: 'BELOW AVERAGE' },
          { label: 'Unknown', id: 'Unknown' },
        ],
      });
    }

    if (lovType === 'ComplianceStatus') {
      return of({
        isSuccessful: true,
        data: [
          { label: 'HIGH', id: 'HIGH' },
          { label: 'MEDIUM', id: 'MEDIUM' },
          { label: 'LOW', id: 'LOW' },
          { label: 'Unknown', id: 'Unknown' },
        ],
      });
    }

    if (lovType === 'RiskExposureIndex') {
      return of({
        isSuccessful: true,
        data: [
          { label: 'LOW RISK', id: 'LOW' },
          { label: 'MEDIUM RISK', id: 'MEDIUM' },
          { label: 'HIGH RISK', id: 'HIGH' },
          { label: 'Unknown', id: 'Unknown' },
        ],
      });
    }

    return this.http.get<ApiResponse>(
      `${this.baseUrl}/CommonLookup/type/${lovType}`,
    );
  }

  getAllKpis(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.baseUrl}/KpisLov/dropdown`,
    );
  }

  /**
   * Trigger manual check for a KPI on an asset.
   * GET KpisLov/manual-from-asset/{assetId}?kpiId={kpiId}
   * Returns JSON: { isSuccessful, message, data: { success, message, data: { kpiId, ... } } }
   */
  manualCheckFromAsset(assetId: number, kpiId: number): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('kpiId', String(kpiId));
    return this.http.get<ApiResponse<any>>(
      `${this.baseUrl}/KpisLov/manual-from-asset/${assetId}`,
      { params },
    );
  }

  /**
   * GET KpisLov/manual-from-asset/{assetId}?kpiId={kpiId} — fetch current KPI value for an asset (e.g. on DataUpdated for Asset.{assetId}.KpisLov).
   */
  getKpisLovManualFromAsset(assetId: number, kpiId?: number): Observable<ApiResponse<any>> {
    const params = kpiId != null ? new HttpParams().set('kpiId', String(kpiId)) : undefined;
    return this.http.get<ApiResponse<any>>(
      `${this.baseUrl}/KpisLov/manual-from-asset/${assetId}`,
      { params: params ?? undefined },
    );
  }

  /**
   * Trigger manual check for all KPIs of an asset.
   * GET KpisLov/manual-from-asset/{assetId}/check-all
   */
  checkAllKpisFromAsset(assetId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.baseUrl}/KpisLov/manual-from-asset/${assetId}/check-all`,
    );
  }

  getAllUsers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/User/dropdown`);
  }

  /** GET Vendor – list used for development/managing vendor dropdowns. */
  getAllVendors(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/Vendor`, {
      headers: { Accept: 'application/json' },
    });
  }

  /** GET /Vendor */
  getVendors(): Observable<ApiResponse<VendorListData>> {
    return this.http.get<ApiResponse<VendorListData>>(`${this.baseUrl}/Vendor`, {
      headers: { Accept: 'text/plain' },
    });
  }

  /** GET /Vendor?VendorRole={development|hosting} */
  getVendorsByRole(vendorRole?: 'development' | 'hosting'): Observable<ApiResponse<VendorListData>> {
    let params = new HttpParams();
    if (vendorRole) {
      params = params.set('VendorRole', vendorRole);
    }
    return this.http.get<ApiResponse<VendorListData>>(`${this.baseUrl}/Vendor`, {
      params,
      headers: { Accept: 'text/plain' },
    });
  }

  /** GET /Vendor/{id} */
  getVendorById(vendorId: number): Observable<ApiResponse<VendorDetailData>> {
    return this.http.get<ApiResponse<VendorDetailData>>(`${this.baseUrl}/Vendor/${vendorId}`, {
      headers: { Accept: 'text/plain' },
    });
  }

  /** GET /CommonLookup/type/{typeName} */
  getCommonLookupByType(typeName: string): Observable<ApiResponse<CommonLookupItem[]>> {
    return this.http.get<ApiResponse<CommonLookupItem[]>>(`${this.baseUrl}/CommonLookup/type/${typeName}`, {
      headers: { Accept: 'text/plain' },
    });
  }

  /** POST /Vendor */
  createVendor(payload: CreateVendorRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/Vendor`, payload, {
      headers: { Accept: 'text/plain', 'Content-Type': 'application/json' },
    });
  }

  /** PUT /Vendor/{id} */
  updateVendor(vendorId: number, payload: CreateVendorRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/Vendor/${vendorId}`, payload, {
      headers: { Accept: 'text/plain', 'Content-Type': 'application/json' },
    });
  }

  /** DELETE /Vendor/{id} */
  deleteVendor(vendorId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/Vendor/${vendorId}`, {
      headers: { Accept: 'text/plain' },
    });
  }

  /** GET /Vendor/{id}/profile */
  getVendorProfile(vendorId: number): Observable<ApiResponse<VendorProfileData>> {
    return this.http.get<ApiResponse<VendorProfileData>>(`${this.baseUrl}/Vendor/${vendorId}/profile`, {
      headers: { Accept: 'text/plain' },
    });
  }

  // Assets

  getAssets(searchQuery?: HttpParams): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset`;
    return this.http.get<ApiResponse<any>>(url, { params: searchQuery });
  }

  getAllAssets(): Observable<ApiResponse<DigitalAsset[]>> {
    return this.http.get<ApiResponse<DigitalAsset[]>>(
      `${this.baseUrl}/Asset/dropdown`,
    );
  }

  /**
   * POST Asset – add asset. Body: ministryId, departmentId?, assetName, assetUrl,
   * citizenImpactLevelId, description, contacts[] (contactName, contactTitle, contactEmail, contactNumber, type).
   */
  addAsset(asset: AddAssetApiRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/Asset`, asset, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
  }

  getAssetById(assetId: number): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset/${assetId}`;
    return this.http.get<ApiResponse<any>>(url);
  }

  getAssetApplicationDetails(assetId: number): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/Asset/${assetId}/application-details`;
    return this.http.get<ApiResponse<any>>(url, {
      headers: { Accept: 'text/plain' },
    });
  }

  /**
   * GET Asset/bulk-upload/template — returns template file for bulk upload (e.g. Excel/CSV).
   * Use responseType blob and optionally read Content-Disposition for filename.
   */
  getBulkUploadTemplate(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/Asset/bulk-upload/template`, {
      responseType: 'blob',
    });
  }

  /**
   * POST Asset/bulk-upload — upload CSV file for bulk asset import.
   * API accepts only CSV files. On validation failure, data contains errors array.
   */
  bulkUpload(file: File): Observable<ApiResponse<string | BulkUploadErrorData>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ApiResponse<string | BulkUploadErrorData>>(
      `${this.baseUrl}/Asset/bulk-upload`,
      formData,
    );
  }

  /**
   * PUT Asset/{id} – update asset with RefId, Path, and Contacts (JSON body).
   * Use this for edit asset; Accept and Content-Type headers are set by HttpClient.
   */
  updateAsset(
    assetId: number | null,
    body: AssetUpdatePutRequest,
  ): Observable<ApiResponse<any>> {
    if (assetId == null) {
      return new Observable((obs) => {
        obs.error(new Error('Asset ID is required for update'));
        obs.complete();
      });
    }
    const url = `${this.baseUrl}/Asset/${assetId}`;
    return this.http.put<ApiResponse<any>>(url, body, {
      headers: { Accept: 'text/plain', 'Content-Type': 'application/json' },
    });
  }

  /**
   * Update asset with document (reference number + file). Sends FormData for multipart support.
   * Backend may use the same PUT Asset/{id} with multipart or a dedicated endpoint.
   */
  updateAssetWithDocument(
    assetId: number | null,
    asset: DigitalAssetRequest,
    referenceNumber: string,
    file: File,
  ): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/Asset/${assetId}`;
    const formData = new FormData();
    Object.entries(asset).forEach(([key, value]) => {
      if (value == null || value === '') return;
      if (key === 'technicalOwners' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });
    formData.append('referenceNumber', referenceNumber);
    formData.append('file', file, file.name);
    return this.http.put<ApiResponse<any>>(url, formData);
  }

  getAssetControlPanelData(
    assetId: number,
  ): Observable<ApiResponse<AssetControlPanelData>> {
    let url = `${this.baseUrl}/Asset/${assetId}/controlpanel`;
    return this.http.get<ApiResponse<AssetControlPanelData>>(url);
  }

  /** Asset history / audit log – GET Asset/{assetId}/history */
  getAssetHistory(assetId: number): Observable<ApiResponse<AssetHistoryItem[]>> {
    const url = `${this.baseUrl}/Asset/${assetId}/history`;
    return this.http.get<ApiResponse<AssetHistoryItem[]>>(url);
  }

  /**
   * Download reference document for an asset history entry.
   * GET Asset/history/{historyId}/download
   * Returns the full response so callers can read Content-Disposition (filename) and Content-Type (MIME) from headers.
   */
  downloadAssetHistoryDocument(historyId: number): Observable<HttpResponse<Blob>> {
    const url = `${this.baseUrl}/Asset/history/${historyId}/download`;
    return this.http.get(url, { responseType: 'blob', observe: 'response' });
  }

  /**
   * Add asset to favorites.
   * POST FavoriteAssets/{assetId}
   */
  addAssetToFavorites(assetId: number): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/FavoriteAssets/${assetId}`;
    return this.http.post<ApiResponse<any>>(url, {});
  }

  /**
   * Get list of favorite assets for the current user.
   * GET FavoriteAssets
   */
  getFavoriteAssets(): Observable<ApiResponse<any[]>> {
    const url = `${this.baseUrl}/FavoriteAssets`;
    return this.http.get<ApiResponse<any[]>>(url);
  }

  /**
   * Remove asset from favorites.
   * DELETE FavoriteAssets/{assetId}
   */
  removeAssetFromFavorites(assetId: number): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/FavoriteAssets/${assetId}`;
    return this.http.delete<ApiResponse<any>>(url);
  }

  // Incidents

  getIncidents(
    searchQuery: HttpParams,
  ): Observable<ApiResponse<ActiveIncident[]>> {
    let url = `${this.baseUrl}/Incident`;
    return this.http.get<ApiResponse<ActiveIncident[]>>(url, {
      params: searchQuery,
    });
  }

  addIncident(incident: IncidentRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.baseUrl}/Incident`,
      incident,
    );
  }
  getMinistryDetailById(ministryId: any): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset/ministry/${ministryId}/summary`;
    return this.http.get<ApiResponse<any>>(url);
  }
  getIncidentByAssetId(
    assetId: any,
    searchQuery?: HttpParams,
  ): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/Incident/asset/${assetId}`;
    return this.http.get<ApiResponse<any>>(url, {
      params: searchQuery ?? undefined,
    });
  }
  /**
   * Get global incident header/summary for incidents dashboard cards.
   * GET /api/Incident/header
   */
  getIncidentHeader(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/Incident/header`;
    return this.http.get<ApiResponse<any>>(url);
  }
  getAssetsDashboad(id: any): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset/${id}/dashboard/header`;
    return this.http.get<ApiResponse<any>>(url);
  }
  getAssestByMinistry(
    searchQuery: HttpParams,
    ministryId: any,
  ): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Asset/ministry/${ministryId}`;
    return this.http.get<ApiResponse<any>>(url, {
      params: searchQuery,
    });
  }

  /**
   * GET /Asset/distribution?ministryId={id}
   */
  getAssetDistributionByMinistry(ministryId?: number): Observable<ApiResponse<AssetDistributionData>> {
    let params = new HttpParams();
    if (ministryId != null) {
      params = params.set('ministryId', String(ministryId));
    }
    return this.http.get<ApiResponse<AssetDistributionData>>(
      `${this.baseUrl}/Asset/distribution`,
      {
        params: params.keys().length > 0 ? params : undefined,
        headers: { Accept: 'text/plain' },
      },
    );
  }

  /**
   * GET /Asset/distribution/vendor/pdf?ministryId={id}
   * Returns vendor distribution report PDF as file/blob response.
   */
  getVendorDistributionPdf(ministryId?: number): Observable<HttpResponse<Blob>> {
    let params = new HttpParams();
    if (ministryId != null) {
      params = params.set('ministryId', String(ministryId));
    }
    return this.http.get(`${this.baseUrl}/Asset/distribution/vendor/pdf`, {
      params: params.keys().length > 0 ? params : undefined,
      headers: { Accept: '*/*' },
      responseType: 'blob',
      observe: 'response',
    });
  }

  /**
   * GET /Asset/distribution/hosting/pdf?ministryId={id}
   * Returns hosting distribution report PDF as file/blob response.
   */
  getHostingDistributionPdf(ministryId?: number): Observable<HttpResponse<Blob>> {
    let params = new HttpParams();
    if (ministryId != null) {
      params = params.set('ministryId', String(ministryId));
    }
    return this.http.get(`${this.baseUrl}/Asset/distribution/hosting/pdf`, {
      params: params.keys().length > 0 ? params : undefined,
      headers: { Accept: '*/*' },
      responseType: 'blob',
      observe: 'response',
    });
  }

  /**
   * GET /Service?MinistryId={id}
   */
  getServicesByMinistry(
    ministryId: number,
    searchQuery?: HttpParams,
  ): Observable<ApiResponse<MinistryServicesResponseData>> {
    let params = searchQuery ?? new HttpParams();
    params = params.set('MinistryId', String(ministryId));
    return this.http.get<ApiResponse<MinistryServicesResponseData>>(
      `${this.baseUrl}/Service`,
      {
        params,
        headers: { Accept: 'text/plain' },
      },
    );
  }

  /**
   * POST /Service
   */
  createService(payload: CreateServiceRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/Service`, payload, {
      headers: { Accept: 'text/plain', 'Content-Type': 'application/json' },
    });
  }

  /**
   * PUT /Service/{id}
   */
  updateService(serviceId: number, payload: CreateServiceRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/Service/${serviceId}`, payload, {
      headers: { Accept: 'text/plain', 'Content-Type': 'application/json' },
    });
  }

  /**
   * GET /Service/{id}
   */
  getServiceById(serviceId: number): Observable<ApiResponse<ServiceDetailData>> {
    return this.http.get<ApiResponse<ServiceDetailData>>(`${this.baseUrl}/Service/${serviceId}`, {
      headers: { Accept: 'text/plain' },
    });
  }

  /**
   * GET /Service/analytics?serviceId={id}
   */
  getServiceAnalytics(serviceId: number): Observable<ApiResponse<ServiceAnalyticsData>> {
    const params = new HttpParams().set('serviceId', String(serviceId));
    return this.http.get<ApiResponse<ServiceAnalyticsData>>(
      `${this.baseUrl}/Service/analytics`,
      {
        params,
        headers: { Accept: 'text/plain' },
      },
    );
  }

  /**
   * GET /Service/validate-name-unique?ministryId={id}&serviceName={name}
   */
  validateServiceNameUnique(
    ministryId: number,
    serviceName: string,
  ): Observable<ApiResponse<ValidateServiceNameUniqueData>> {
    const params = new HttpParams()
      .set('ministryId', String(ministryId))
      .set('serviceName', serviceName);
    return this.http.get<ApiResponse<ValidateServiceNameUniqueData>>(
      `${this.baseUrl}/Service/validate-name-unique`,
      { params, headers: { Accept: 'text/plain' } },
    );
  }

  /**
   * GET /Service/{serviceId}/steps/{stepName}/events/metrics
   */
  getServiceStepEventMetrics(
    serviceId: number,
    stepName: string,
  ): Observable<ApiResponse<ServiceStepEventMetricsData>> {
    const encoded = encodeURIComponent(stepName);
    return this.http.get<ApiResponse<ServiceStepEventMetricsData>>(
      `${this.baseUrl}/Service/${serviceId}/steps/${encoded}/events/metrics`,
      { headers: { Accept: 'text/plain' } },
    );
  }

  /**
   * GET /Service/{serviceId}/steps/order-limits
   */
  getServiceStepOrderLimits(serviceId: number): Observable<ApiResponse<ServiceStepOrderLimitsData>> {
    return this.http.get<ApiResponse<ServiceStepOrderLimitsData>>(
      `${this.baseUrl}/Service/${serviceId}/steps/order-limits`,
      { headers: { Accept: 'text/plain' } },
    );
  }

  /**
   * POST /Service/{serviceId}/steps
   */
  postServiceSteps(
    serviceId: number,
    payload: PostServiceStepsRequest,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/Service/${serviceId}/steps`, payload, {
      headers: { Accept: 'text/plain', 'Content-Type': 'application/json' },
    });
  }

  /**
   * PUT /Service/{serviceId}/steps/{stepId}
   */
  putServiceStep(
    serviceId: number,
    stepId: number,
    payload: PutServiceStepRequest,
  ): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.baseUrl}/Service/${serviceId}/steps/${stepId}`,
      payload,
      { headers: { Accept: 'text/plain', 'Content-Type': 'application/json' } },
    );
  }

  /**
   * POST /service-correspondance/keys?downloadPdf={bool}
   * Body: { assetId }
   */
  postServiceCorrespondenceKeys(
    assetId: number,
    downloadPdf: boolean = false,
  ): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('downloadPdf', String(downloadPdf));
    return this.http.post<ApiResponse<any>>(
      `${this.baseUrl}/service-correspondance/keys`,
      { assetId },
      {
        params,
        headers: { Accept: '*/*', 'Content-Type': 'application/json' },
      },
    );
  }

  /**
   * Same as POST /service-correspondance/keys but returns raw body as Blob (for PDF/file in new tab).
   */
  postServiceCorrespondenceKeysBlob(
    assetId: number,
    downloadPdf: boolean = true,
  ): Observable<HttpResponse<Blob>> {
    const params = new HttpParams().set('downloadPdf', String(downloadPdf));
    return this.http.post(
      `${this.baseUrl}/service-correspondance/keys`,
      { assetId },
      {
        params,
        headers: { Accept: '*/*', 'Content-Type': 'application/json' },
        responseType: 'blob',
        observe: 'response',
      },
    );
  }

  getIncidentById(incidentId: number): Observable<ApiResponse<any>> {
    let url = `${this.baseUrl}/Incident/${incidentId}`;
    return this.http.get<ApiResponse<any>>(url);
  }

  /**
   * Fetch full incident details for the incident details page.
   * GET /api/Incident/{id}/details
   */
  getIncidentDetailsById(incidentId: number): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/Incident/${incidentId}/details`;
    return this.http.get<ApiResponse<any>>(url);
  }

  /**
   * Fetch incident comments (timeline) for the incident details page.
   * GET /api/Incident/{id}/comments — requires Authorization.
   */
  getIncidentCommentsById(incidentId: number): Observable<ApiResponse<any[]>> {
    const url = `${this.baseUrl}/Incident/${incidentId}/comments`;
    return this.http.get<ApiResponse<any[]>>(url);
  }

  /**
   * Add a comment to an incident.
   * POST /api/Incident/{id}/comments — requires Authorization.
   * Body: { incidentId, comment, status }.
   */
  addIncidentComment(
    incidentId: number,
    payload: { incidentId: number; comment: string; status: string },
  ): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/Incident/${incidentId}/comments`;
    return this.http.post<ApiResponse<any>>(url, payload);
  }

  // Admin Dashboard

  /**
   * Fetch high-level summary metrics for the admin dashboard.
   * Matches /api/AdminDashboard/summary from the OpenAPI spec.
   */
  getAdminDashboardSummary(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/AdminDashboard/summary`;
    return this.http.get<ApiResponse<any>>(url);
  }

  // PM Dashboard

  getPMDashboard(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/PMDashboard`;
    return this.http.get<ApiResponse<any>>(url);
  }

  getPMDashboardHeader(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/PMDashboard/header`;
    return this.http.get<ApiResponse<any>>(url);
  }

  getPMDashboardIndices(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/PMDashboard/indices`;
    return this.http.get<ApiResponse<any>>(url);
  }

  getPMDashboardBottomMinistries(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/PMDashboard/bottom-ministries`;
    return this.http.get<ApiResponse<any>>(url);
  }

  getPMDashboardTopMinistries(): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/PMDashboard/top-ministries`;
    return this.http.get<ApiResponse<any>>(url);
  }

  /** GET /setup/dashboard — setup dashboard summary counts. */
  getSetupDashboardSummary(): Observable<ApiResponse<SetupDashboardSummary>> {
    return this.http.get<ApiResponse<SetupDashboardSummary>>(
      `${this.baseUrl}/setup/dashboard`,
      { headers: { Accept: 'text/plain' } },
    );
  }

  // Core reports (dynamic reports module)

  /** GET /core-reports/categories — report category dropdown. */
  getCoreReportCategories(): Observable<ApiResponse<CoreReportCategory[]>> {
    return this.http.get<ApiResponse<CoreReportCategory[]>>(
      `${this.baseUrl}/core-reports/categories`,
      { headers: { Accept: 'application/json' } },
    );
  }

  /** GET /core-reports/sub-categories?categoryId= (+ optional ministry/department/asset). */
  getCoreReportSubCategories(
    categoryId: number,
    filters?: { ministryId?: number; departmentId?: number; assetId?: number | string },
  ): Observable<ApiResponse<CoreReportSubCategory[]>> {
    let params = new HttpParams().set('categoryId', String(categoryId));
    if (filters?.ministryId != null) {
      params = params.set('ministryId', String(filters.ministryId));
    }
    if (filters?.departmentId != null) {
      params = params.set('departmentId', String(filters.departmentId));
    }
    if (filters?.assetId != null && filters.assetId !== '') {
      params = params.set('assetId', String(filters.assetId));
    }
    return this.http.get<ApiResponse<CoreReportSubCategory[]>>(
      `${this.baseUrl}/core-reports/sub-categories`,
      { params, headers: { Accept: 'application/json' } },
    );
  }

  /**
   * GET /core-reports/data-points/{subCategoryId}
   * Optional: ministryId, departmentId, assetId (query).
   */
  getCoreReportDataPoints(
    subCategoryId: number,
    filters?: { ministryId?: number; departmentId?: number; assetId?: number | string },
  ): Observable<ApiResponse<unknown>> {
    let params = new HttpParams();
    if (filters?.ministryId != null) {
      params = params.set('ministryId', String(filters.ministryId));
    }
    if (filters?.departmentId != null) {
      params = params.set('departmentId', String(filters.departmentId));
    }
    if (filters?.assetId != null && filters.assetId !== '') {
      params = params.set('assetId', String(filters.assetId));
    }
    const options =
      params.keys().length > 0
        ? { params, headers: { Accept: 'application/json' } }
        : { headers: { Accept: 'application/json' } };
    return this.http.get<ApiResponse<unknown>>(
      `${this.baseUrl}/core-reports/data-points/${subCategoryId}`,
      options,
    );
  }

  /**
   * GET /core-reports/categories/{categoryId}/pdf
   * Optional query params: ministryId, departmentId, assetId.
   * Returns PDF/blob response.
   */
  getCoreReportCategoryPdf(
    categoryId: number,
    filters?: { ministryId?: number; departmentId?: number; assetId?: number | string },
  ): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.ministryId != null) {
      params = params.set('ministryId', String(filters.ministryId));
    }
    if (filters?.departmentId != null) {
      params = params.set('departmentId', String(filters.departmentId));
    }
    if (filters?.assetId != null && filters.assetId !== '') {
      params = params.set('assetId', String(filters.assetId));
    }
    const options = params.keys().length > 0 ? { params, responseType: 'blob' as const } : { responseType: 'blob' as const };
    return this.http.get(`${this.baseUrl}/core-reports/categories/${categoryId}/pdf`, options);
  }
}

/** Item from GET /core-reports/categories */
export interface CoreReportCategory {
  id: number;
  name: string;
  description?: string | null;
  orderIndex?: number;
}

/** Item from GET /core-reports/sub-categories */
export interface CoreReportSubCategory {
  id: number;
  name: string;
  description?: string | null;
  orderIndex?: number;
  categoryId?: number;
}

export interface SetupDashboardSummary {
  totalMinistriesCount: number;
  totalDepartmentsCount: number;
  totalVendorsCount: number;
  hostingTypesCount: number;
}




