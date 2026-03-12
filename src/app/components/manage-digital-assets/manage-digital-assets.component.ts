import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray, AbstractControl } from '@angular/forms';
import { BreadcrumbItem } from '../reusable/reusable-breadcrum/reusable-breadcrum.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { ApiResponse, ApiService, BulkUploadErrorRow, BulkUploadErrorData, AssetUpdatePutRequest, AssetContactItem, AddAssetApiRequest } from '../../services/api.service';
import { UtilsService } from '../../services/utils.service';
import { DashboardReturnStateService } from '../../services/dashboard-return-state.service';
import { CanComponentDeactivate } from '../../guards/can-deactivate.guard';
import { MatDialog } from '@angular/material/dialog';
import { UploadDocumentDialogComponent } from '../reusable/upload-document-dialog/upload-document-dialog.component';

/** Single technical owner contact (dynamic list). */
export interface TechnicalOwnerItem {
  name: string;
  email: string;
  phone: string;
  contactTitle: string;
}

export interface DigitalAssetRequest {
  ministryId: number;
  departmentId?: number;
  assetName: string;
  assetUrl: string;
  description: string;
  citizenImpactLevelId: number;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  /** Dynamic list of technical owners (Name, Email, Phone, Contact Title). */
  technicalOwners: TechnicalOwnerItem[];
  /** Set when editing asset; from CommonLookup/type/AssetStatus */
  assetStatusId?: number;
}

@Component({
  selector: 'app-manage-digital-assets',
  templateUrl: './manage-digital-assets.component.html',
  styleUrl: './manage-digital-assets.component.scss',
  standalone: false,
})
export class ManageDigitalAssetsComponent implements OnInit, OnDestroy, CanComponentDeactivate {

  pageInfo = signal<{
    pageState: 'add' | 'edit' | null;
    title: string;
    subtitle: string;
    assetId: number | null;
  }>({
    pageState: null,
    title: '',
    subtitle: '',
    assetId: null
  });

  digitalAssetForm!: FormGroup;

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Add Digital Assets' }
  ];

  ministryOptions: { label: string, value: number }[] = [];
  departments: { label: string, value: number }[] = [];
  citizenImpactLevelOptions: { label: string, value: number }[] = [];
  /** Options for Asset Status dropdown (edit mode only); from API CommonLookup/type/AssetStatus */
  assetStatusOptions: { label: string, value: number }[] = [];


  // Error messages
  urlErrorMessages = {
    pattern: 'Please enter a valid URL starting with http:// or https://'
  };

  performanceSlaTargetErrorMessages = {
    min: 'Please enter a value between 0 and 100',
    max: 'Please enter a value between 0 and 100'
  };

  complianceTargetErrorMessages = {
    min: 'Please enter a value between 0 and 100',
    max: 'Please enter a value between 0 and 100'
  };

  contentFreshnessThresholdErrorMessages = {
    min: 'Please enter a value greater than 0'
  };

  assetStatusErrorMessages = {
    required: 'Asset Status is required'
  };

  technicalOwnerErrorMessages = {
    required: 'This field is required',
    email: 'Enter a valid email address',
    pattern: 'Enter a valid phone number (e.g. +92-300-1234567)',
  };

  @ViewChild('bulkUploadInput') bulkUploadInput!: ElementRef<HTMLInputElement>;
  bulkUploadErrors = signal<BulkUploadErrorRow[] | null>(null);

  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private fb: FormBuilder,
    private api: ApiService,
    private utils: UtilsService,
    private location: Location,
    private dashboardReturnState: DashboardReturnStateService,
    private dialog: MatDialog,
    private breadcrumbService: BreadcrumbService,
  ) { }

  ngOnDestroy(): void {
    this.breadcrumbService.setCurrentLabel(null);
  }

  ngOnInit() {
    this.createForm();

    const routePath = this.activatedRoute.snapshot.routeConfig?.path ?? '';
    const isAddMode = routePath === 'add-digital-assets';
    this.pageInfo.set({
      pageState: isAddMode ? 'add' : 'edit',
      title: isAddMode ? 'Add New Digital Asset' : 'Edit Digital Assets',
      subtitle: isAddMode ? 'Fill in the details below to add a new digital asset to the monitoring system' : 'Fill in the details below to update existing digital asset to the monitoring system',
      assetId: isAddMode ? null : this.activatedRoute.snapshot.queryParams['assetId']
    });

    if (this.pageInfo().pageState === 'edit') {

      if (!this.pageInfo().assetId) {
        this.utils.showToast('Asset ID is required', 'Error', 'error');
        this.navigateToAssets();
        return;
      };

      this.breadcrumbs = [
        { label: 'Edit Digital Assets' }
      ];

      this.getAssetStatusOptions();
      this.getAssetById(this.pageInfo().assetId);
      // Asset Status is required only in edit mode
      this.digitalAssetForm.get('assetStatusId')?.setValidators(Validators.required);
    }


    this.digitalAssetForm.get('ministryId')?.valueChanges.subscribe((value: number) => {
      this.getDepartmentsByMinistry(value);
    });

    this.technicalOwnersArray.valueChanges.subscribe(() => {
      this.technicalOwnersArray.updateValueAndValidity();
    });

    this.getMinistryOptions();
    this.getCitizenImpactLevelOptions();
  }


  /** Phone pattern: optional; when provided allow digits, +, spaces, hyphens, parentheses (min 8 chars). */
  private static readonly PHONE_PATTERN = /^$|^[\d\s+\-()]{8,}$/;

  createForm() {
    this.digitalAssetForm = this.fb.group({
      // Basic Information
      ministryId: ['', Validators.required],
      departmentId: [''],
      assetName: ['', Validators.required],
      assetUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],

      // Compliance Configuration
      citizenImpactLevelId: ['', Validators.required],

      // Additional Information
      description: ['', Validators.maxLength(500)],
      primaryContactName: [''],
      primaryContactEmail: ['', [Validators.email]],
      primaryContactPhone: [''],

      // Dynamic Technical Owners (Name, Email, Phone, Contact Title)
      technicalOwners: this.fb.array([this.createTechnicalOwnerGroup()], [this.duplicateTechnicalOwnerEmailValidator()]),

      // Edit only: Asset Status (from CommonLookup/type/AssetStatus)
      assetStatusId: [null as number | null],
      // Edit: RefId and Path for PUT Asset/{id} (from GET or document upload)
      refId: [''],
      path: [''],
    });
  }

  createTechnicalOwnerGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(ManageDigitalAssetsComponent.PHONE_PATTERN)]],
      contactTitle: ['', Validators.required],
    });
  }

  get technicalOwnersArray(): FormArray {
    return this.digitalAssetForm.get('technicalOwners') as FormArray;
  }

  addTechnicalOwner(): void {
    this.technicalOwnersArray.push(this.createTechnicalOwnerGroup());
  }

  /** Add a new technical owner row below the row at the given index. */
  addTechnicalOwnerAfter(index: number): void {
    this.technicalOwnersArray.insert(index + 1, this.createTechnicalOwnerGroup());
  }

  removeTechnicalOwner(index: number): void {
    if (this.technicalOwnersArray.length <= 1) return;
    this.technicalOwnersArray.removeAt(index);
  }

  /** Validator: duplicate email among technical owners prevents submission. */
  private duplicateTechnicalOwnerEmailValidator() {
    return (control: AbstractControl): { duplicateEmail: boolean } | null => {
      const arr = control as FormArray;
      const emails = arr.controls
        .map((c) => (c.get('email')?.value as string)?.trim()?.toLowerCase())
        .filter((e) => e);
      const set = new Set(emails);
      if (emails.length !== set.size) return { duplicateEmail: true };
      return null;
    };
  }
  getMinistryOptions() {
    this.api.getAllMinistries().subscribe({
      next: (res: ApiResponse) => {
        if (res.isSuccessful) {
          this.ministryOptions = res.data.map((ministry: any) => ({ label: ministry.ministryName, value: ministry.id })) || [];
        } else {
          this.utils.showToast(res.message, 'Error fetching ministries', 'error');
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error fetching ministries', 'error');
      }
    });
  }

  getDepartmentsByMinistry(ministryId: number) {
    this.api.getDepartmentsByMinistry(ministryId).subscribe({
      next: (res: ApiResponse) => {
        if (res.isSuccessful) {
          this.departments = res.data.map((department: any) => ({ label: department.departmentName, value: department.id })) || [];
        } else {
          this.utils.showToast(res.message, 'Error fetching departments', 'error');
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error fetching departments', 'error');
      }
    });
  }

  getCitizenImpactLevelOptions() {
    this.api.getLovByType('citizenImpactLevel').subscribe({
      next: (res: ApiResponse) => {
        if (res.isSuccessful) {
          this.citizenImpactLevelOptions = res.data.map((citizenImpactLevel: any) => ({ label: citizenImpactLevel.name, value: citizenImpactLevel.id })) || [];
        } else {
          this.utils.showToast(res.message, 'Error fetching citizen impact levels', 'error');
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error fetching citizen impact levels', 'error');
      }
    });
  }

  /** Load Asset Status options for edit mode (CommonLookup/type/AssetStatus). */
  getAssetStatusOptions() {
    this.api.getLovByType('AssetStatus').subscribe({
      next: (res: ApiResponse) => {
        if (res.isSuccessful && Array.isArray(res.data)) {
          this.assetStatusOptions = res.data.map((item: { id: number; name: string }) => ({ label: item.name, value: item.id }));
        } else {
          this.utils.showToast(res.message ?? 'Failed to load asset status', 'Asset Status', 'error');
        }
      },
      error: (err: any) => {
        this.utils.showToast(err?.message ?? err, 'Error fetching asset status', 'error');
      }
    });
  }

  getAssetById(assetId: number | null) {
    if (!assetId) {
      return;
    }

    this.api.getAssetById(assetId).subscribe({
      next: (res: ApiResponse) => {
        if (res.isSuccessful) {
          const data = res.data as Record<string, unknown>;
          const name = (data['websiteApplication'] ?? data['assetName'] ?? 'Edit Digital Asset') as string;
          this.breadcrumbService.setCurrentLabel(name);

          // API response: contacts[] with contactName, contactTitle, contactNumber, contactEmail, type ("Business" | "Technical")
          const contacts = (data['contacts'] as Array<Record<string, unknown>>) ?? [];
          const businessContact = contacts.find((c) => String(c['type'] ?? '').toLowerCase() === 'business');
          const technicalContacts = contacts.filter((c) => String(c['type'] ?? '').toLowerCase() === 'technical');

          // Primary contact from type === "Business"
          this.digitalAssetForm.patchValue({
            ministryId: data['ministryId'] ?? '',
            departmentId: data['departmentId'] ?? '',
            assetName: data['assetName'] ?? '',
            assetUrl: data['assetUrl'] ?? '',
            description: data['description'] ?? '',
            citizenImpactLevelId: data['citizenImpactLevelId'] ?? '',
            assetStatusId: data['statusId'] ?? data['assetStatusId'] ?? null,
            refId: data['refId'] ?? data['RefId'] ?? '',
            path: data['path'] ?? data['Path'] ?? data['documentPath'] ?? '',
            primaryContactName: businessContact?.['contactName'] ?? '',
            primaryContactEmail: businessContact?.['contactEmail'] ?? '',
            primaryContactPhone: businessContact?.['contactNumber'] ?? '',
          });

          // Technical owners: one row per contact with type === "Technical"
          this.technicalOwnersArray.clear();
          if (technicalContacts.length > 0) {
            for (const c of technicalContacts) {
              this.technicalOwnersArray.push(this.fb.group({
                name: [c['contactName'] ?? '', Validators.required],
                email: [c['contactEmail'] ?? '', [Validators.required, Validators.email]],
                phone: [c['contactNumber'] ?? '', [Validators.pattern(ManageDigitalAssetsComponent.PHONE_PATTERN)]],
                contactTitle: [c['contactTitle'] ?? '', Validators.required],
              }));
            }
          } else {
            // Legacy fallback: technicalOwners / technicalContacts from old API shape
            const rawOwners = data['technicalOwners'] ?? data['technicalContacts'];
            if (Array.isArray(rawOwners) && rawOwners.length > 0) {
              for (const o of rawOwners as Record<string, unknown>[]) {
                this.technicalOwnersArray.push(this.fb.group({
                  name: [o['name'] ?? o['technicalContactName'] ?? o['contactName'] ?? '', Validators.required],
                  email: [o['email'] ?? o['technicalContactEmail'] ?? o['contactEmail'] ?? '', [Validators.required, Validators.email]],
                  phone: [o['phone'] ?? o['technicalContactPhone'] ?? o['contactNumber'] ?? '', [Validators.pattern(ManageDigitalAssetsComponent.PHONE_PATTERN)]],
                  contactTitle: [o['contactTitle'] ?? '', Validators.required],
                }));
              }
            } else if (data['technicalContactName'] || data['technicalContactEmail']) {
              this.technicalOwnersArray.push(this.fb.group({
                name: [data['technicalContactName'] ?? '', Validators.required],
                email: [data['technicalContactEmail'] ?? '', [Validators.required, Validators.email]],
                phone: [data['technicalContactPhone'] ?? '', [Validators.pattern(ManageDigitalAssetsComponent.PHONE_PATTERN)]],
                contactTitle: [data['technicalContactTitle'] ?? '', Validators.required],
              }));
            } else {
              this.technicalOwnersArray.push(this.createTechnicalOwnerGroup());
            }
          }

          this.digitalAssetForm.markAsPristine();
          this.digitalAssetForm.markAsUntouched();
        } else {
          this.utils.showToast(res, 'Error fetching asset', 'error');
          this.location.back();
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error fetching asset', 'error');
        this.location.back();
      }
    });
  }


  onSubmit() {
    if (!this.isFormValidForSubmit()) return;

    const raw = this.digitalAssetForm.value as Record<string, unknown>;
    const technicalOwners = (raw['technicalOwners'] as TechnicalOwnerItem[]) ?? [];
    const payload: DigitalAssetRequest = {
      ...raw,
      ministryId: raw['ministryId'] as number,
      assetName: raw['assetName'] as string,
      assetUrl: raw['assetUrl'] as string,
      description: raw['description'] as string,
      citizenImpactLevelId: raw['citizenImpactLevelId'] as number,
      primaryContactName: raw['primaryContactName'] as string,
      primaryContactEmail: raw['primaryContactEmail'] as string,
      primaryContactPhone: raw['primaryContactPhone'] as string,
      technicalOwners,
    };
    if (raw['departmentId'] != null && raw['departmentId'] !== '') {
      payload.departmentId = raw['departmentId'] as number;
    }
    if (this.pageInfo().pageState === 'edit') {
      const contacts: AssetContactItem[] = [];
      if (raw['primaryContactName'] || raw['primaryContactEmail']) {
        contacts.push({
          ContactName: (raw['primaryContactName'] as string) || 'Primary Contact',
          ContactTitle: 'Primary',
          ContactNumber: (raw['primaryContactPhone'] as string) || '',
          ContactEmail: (raw['primaryContactEmail'] as string) || '',
          Type: 'Business',
        });
      }
      technicalOwners.forEach((o) => {
        contacts.push({
          ContactName: o.name || 'Technical Owner',
          ContactTitle: o.contactTitle || 'Technical Owner',
          ContactNumber: o.phone || '',
          ContactEmail: o.email || '',
          Type: 'Technical',
        });
      });
      if (contacts.length === 0) {
        contacts.push({
          ContactName: 'Primary Contact',
          ContactTitle: 'Primary',
          ContactNumber: (raw['primaryContactPhone'] as string) || '',
          ContactEmail: (raw['primaryContactEmail'] as string) || '',
          Type: 'Business',
        });
      }
      const putBody: AssetUpdatePutRequest = {
        RefId: (raw['refId'] as string) || '',
        Path: (raw['path'] as string) || '',
        Contacts: contacts,
      };
      this.api.updateAsset(this.pageInfo().assetId, putBody).subscribe({
        next: (res: ApiResponse) => {
          if (res.isSuccessful) {
            this.utils.showToast(res.message, 'Asset updated successfully', 'success');
            this.digitalAssetForm.markAsPristine();
            this.navigateToAssets();
          } else {
            this.utils.showToast(res.message, 'Error updating asset', 'error');
          }
        },
        error: (error: any) => {
          this.utils.showToast(error, 'Error updating asset', 'error');
        },
      });
      return;
    }

    const contacts: AddAssetApiRequest['contacts'] = [];
    if (raw['primaryContactName'] || raw['primaryContactEmail']) {
      contacts.push({
        contactName: (raw['primaryContactName'] as string) || 'Primary Contact',
        contactTitle: 'Primary',
        contactEmail: (raw['primaryContactEmail'] as string) || '',
        contactNumber: (raw['primaryContactPhone'] as string) || '',
        type: 'Business',
      });
    }
    technicalOwners.forEach((o) => {
      contacts.push({
        contactName: o.name || 'Technical Owner',
        contactTitle: o.contactTitle || 'Technical Owner',
        contactEmail: o.email || '',
        contactNumber: o.phone || '',
        type: 'Technical',
      });
    });
    if (contacts.length === 0) {
      contacts.push({
        contactName: 'Primary Contact',
        contactTitle: 'Primary',
        contactEmail: (raw['primaryContactEmail'] as string) || '',
        contactNumber: (raw['primaryContactPhone'] as string) || '',
        type: 'Business',
      });
    }
    const addBody: AddAssetApiRequest = {
      ministryId: payload.ministryId,
      assetName: payload.assetName,
      assetUrl: payload.assetUrl,
      citizenImpactLevelId: payload.citizenImpactLevelId,
      description: payload.description ?? '',
      contacts,
    };
    if (payload.departmentId != null) {
      addBody.departmentId = payload.departmentId;
    }
    this.api.addAsset(addBody).subscribe({
      next: (res: ApiResponse) => {
        if (res.isSuccessful) {
          this.utils.showToast(res.message, 'Asset added successfully', 'success');
          this.digitalAssetForm.markAsPristine();
          this.navigateToAssets();
        } else {
          this.utils.showToast(res.message, 'Error adding asset', 'error');
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error adding asset', 'error');
      }
    });
  }

  onDownloadTemplate(): void {
    this.api.getBulkUploadTemplate().subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk-upload-template.csv';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        this.utils.showToast('Template downloaded successfully.', 'Import Assets', 'success');
      },
      error: () => {
        this.utils.showToast('Failed to download template. Please try again.', 'Import Assets', 'error');
      },
    });
  }

  onBulkUpload(): void {
    this.bulkUploadInput?.nativeElement?.click();
  }

  onBulkUploadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.bulkUploadErrors.set(null);
    this.api.bulkUpload(file).subscribe({
      next: (res) => {
        if (res.isSuccessful) {
          this.utils.showToast(
            res.message ?? 'Bulk upload completed successfully.',
            'Import Assets',
            'success',
          );
          this.route.navigate(['/asset']);
        } else {
          const data = res.data as BulkUploadErrorData | undefined;
          if (data?.errors?.length) {
            this.bulkUploadErrors.set(data.errors);
            this.downloadBulkUploadErrorsCsv();
            this.utils.showToast(
              (res.message ?? 'Bulk upload failed.') + ' Error report has been downloaded.',
              'Import Assets',
              'error',
            );
          } else {
            this.utils.showToast(res.message ?? 'Bulk upload failed.', 'Import Assets', 'error');
          }
        }
        input.value = '';
      },
      error: (err: any) => {
        const body = err?.error;
        const data = body?.data as BulkUploadErrorData | undefined;
        if (data?.errors?.length) {
          this.bulkUploadErrors.set(data.errors);
          this.utils.showToast(
            (body?.message ?? 'Bulk upload failed.') + ' Error report has been downloaded.',
            'Import Assets',
            'error',
          );
        } else {
          const message =
            body?.message ?? err?.message ?? 'Failed to upload file. Only CSV files are allowed.';
          this.utils.showToast(message, 'Import Assets', 'error');
        }
        input.value = '';
      },
    });
  }

  downloadBulkUploadErrorsCsv(): void {
    const errors = this.bulkUploadErrors();
    if (!errors?.length) return;
    const headers = ['Row Number', 'Asset Name', 'Error Message'];
    const rows = errors.map((e) => [
      String(e.rowNumber),
      `"${(e.assetName ?? '').replace(/"/g, '""')}"`,
      `"${(e.errorMessage ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-upload-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  closeBulkUploadErrors(): void {
    this.bulkUploadErrors.set(null);
  }

  /** Navigate to assets list, preserving dashboard filters when returning from edit. */
  private navigateToAssets(): void {
    const queryParams = this.dashboardReturnState.consumeReturnQueryParams();
    if (queryParams && Object.keys(queryParams).length > 0) {
      this.route.navigate(['/asset'], { queryParams });
    } else {
      this.route.navigateByUrl('/asset');
    }
  }

  // Helper method to get form control
  getControl(controlName: string): FormControl {
    return this.digitalAssetForm.get(controlName) as FormControl;
  }

  getTechnicalOwnerControl(index: number, field: string): FormControl {
    return this.technicalOwnersArray.at(index).get(field) as FormControl;
  }

  // CanDeactivate implementation
  canDeactivate(): boolean {
    if (this.digitalAssetForm.dirty) {
      // Form has unsaved changes
      return false;
    }
    // Form is clean, allow navigation
    return true;
  }

  /**
   * Returns true only when the whole form (including Technical Owners) is valid. Use before opening dialog or submitting.
   * Forces validation and touch so that UI shows errors.
   */
  private isFormValidForSubmit(): boolean {
    this.digitalAssetForm.markAllAsTouched();
    this.technicalOwnersArray.controls.forEach((group) => group.markAllAsTouched());
    this.technicalOwnersArray.updateValueAndValidity({ emitEvent: true });
    this.digitalAssetForm.updateValueAndValidity({ emitEvent: true });
    if (this.digitalAssetForm.invalid) return false;
    if (this.technicalOwnersArray.invalid) return false;
    const arr = this.technicalOwnersArray;
    for (let i = 0; i < arr.length; i++) {
      const g = arr.at(i) as FormGroup;
      if (g.get('name')?.invalid || g.get('email')?.invalid || g.get('contactTitle')?.invalid) return false;
    }
    return true;
  }

  /**
   * Called when user clicks "Update Digital Asset" (edit mode).
   * Runs form validation first (including Technical Owners). If invalid, shows errors and does not open dialog.
   * If valid, opens the reference/document upload dialog.
   */
  onUpdateDigitalAssetClick(): void {
    if (!this.isFormValidForSubmit()) return;
    this.openUploadDocumentDialog();
  }

  /** Opens upload document dialog; on submit, receives referenceNumber + file and auto-submits edit form. Does not open if form is invalid. */
  openUploadDocumentDialog(): void {
    if (!this.isFormValidForSubmit()) return;
    const dialogRef = this.dialog.open(UploadDocumentDialogComponent, {
      width: '520px',
      disableClose: false,
      panelClass: 'upload-document-dialog-dark',
    });

    dialogRef.afterClosed().subscribe((result: { referenceNumber: string; file: File } | undefined) => {
      if (!result?.referenceNumber || !result?.file) {
        return; // Cancel or invalid
      }
      const file = result.file;
      console.log({
        referenceNumber: result.referenceNumber,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });
      this.submitEditFormWithDocument(result.referenceNumber, file);
    });
  }

  /** Submits the edit form with document (reference number + file). Uses FormData if file is provided. */
  private submitEditFormWithDocument(referenceNumber: string, file: File): void {
    if (this.digitalAssetForm.invalid) {
      this.digitalAssetForm.markAllAsTouched();
      return;
    }

    const raw = this.digitalAssetForm.value as Record<string, unknown>;
    const technicalOwners = (raw['technicalOwners'] as TechnicalOwnerItem[]) ?? [];
    const payload: DigitalAssetRequest = {
      ...raw,
      ministryId: raw['ministryId'] as number,
      assetName: raw['assetName'] as string,
      assetUrl: raw['assetUrl'] as string,
      description: raw['description'] as string,
      citizenImpactLevelId: raw['citizenImpactLevelId'] as number,
      primaryContactName: raw['primaryContactName'] as string,
      primaryContactEmail: raw['primaryContactEmail'] as string,
      primaryContactPhone: raw['primaryContactPhone'] as string,
      technicalOwners,
    };
    if (raw['departmentId'] != null && raw['departmentId'] !== '') {
      payload.departmentId = raw['departmentId'] as number;
    }
    if (raw['assetStatusId'] != null && raw['assetStatusId'] !== '') {
      payload.assetStatusId = raw['assetStatusId'] as number;
    }

    this.api.updateAssetWithDocument(this.pageInfo().assetId, payload, referenceNumber, file).subscribe({
      next: (res: ApiResponse) => {
        if (res.isSuccessful) {
          this.utils.showToast(res.message, 'Asset updated successfully', 'success');
          this.digitalAssetForm.markAsPristine();
          this.navigateToAssets();
        } else {
          this.utils.showToast(res.message, 'Error updating asset', 'error');
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error updating asset', 'error');
      },
    });
  }

}
