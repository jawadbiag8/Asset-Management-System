import { Component, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { BreadcrumbItem } from '../reusable/reusable-breadcrum/reusable-breadcrum.component';
import { ApiResponse, ApiService, BulkUploadErrorRow, BulkUploadErrorData } from '../../services/api.service';
import { UtilsService } from '../../services/utils.service';
import { DashboardReturnStateService } from '../../services/dashboard-return-state.service';
import { CanComponentDeactivate } from '../../guards/can-deactivate.guard';
import { MatDialog } from '@angular/material/dialog';
import { UploadDocumentDialogComponent } from '../reusable/upload-document-dialog/upload-document-dialog.component';

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
  technicalContactName: string;
  technicalContactEmail: string;
  technicalContactPhone: string;
  /** Set when editing asset; from CommonLookup/type/AssetStatus */
  assetStatusId?: number;
}

@Component({
  selector: 'app-manage-digital-assets',
  templateUrl: './manage-digital-assets.component.html',
  styleUrl: './manage-digital-assets.component.scss',
  standalone: false,
})
export class ManageDigitalAssetsComponent implements OnInit, CanComponentDeactivate {

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
  ) { }

  ngOnInit() {
    this.createForm();

    const routePath = this.activatedRoute.snapshot.routeConfig?.path ?? '';
    const isAddMode = routePath === 'add-digital-assets';
    this.pageInfo.set({
      pageState: isAddMode ? 'add' : 'edit',
      title: isAddMode ? 'Add New Digital Asset' : 'Edit Digital Asset',
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

    this.getMinistryOptions();
    this.getCitizenImpactLevelOptions();
  }


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
      technicalContactName: [''],
      technicalContactEmail: ['', [Validators.email]],
      technicalContactPhone: [''],

      // Edit only: Asset Status (from CommonLookup/type/AssetStatus)
      assetStatusId: [null as number | null],
    });
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
          this.digitalAssetForm.patchValue({
            ...data,
            assetStatusId: data['statusId'] ?? data['assetStatusId'],
          });
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
    if (this.digitalAssetForm.invalid) {
      this.digitalAssetForm.markAllAsTouched();
      return;
    }

    const raw = this.digitalAssetForm.value as Record<string, unknown>;
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
      technicalContactName: raw['technicalContactName'] as string,
      technicalContactEmail: raw['technicalContactEmail'] as string,
      technicalContactPhone: raw['technicalContactPhone'] as string,
    };
    if (raw['departmentId'] != null && raw['departmentId'] !== '') {
      payload.departmentId = raw['departmentId'] as number;
    }
    if (this.pageInfo().pageState === 'edit' && raw['assetStatusId'] != null && raw['assetStatusId'] !== '') {
      payload.assetStatusId = raw['assetStatusId'] as number;
    }

    if (this.pageInfo().pageState === 'edit') {
      this.api.updateAsset(this.pageInfo().assetId, payload).subscribe({
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
        }
      });

      return
    }

    this.api.addAsset(payload).subscribe({
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
          this.route.navigate(['/dashboard']);
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
      this.route.navigate(['/dashboard'], { queryParams });
    } else {
      this.route.navigateByUrl('/dashboard');
    }
  }

  // Helper method to get form control
  getControl(controlName: string): FormControl {
    return this.digitalAssetForm.get(controlName) as FormControl;
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

  /** Opens upload document dialog; on submit, receives referenceNumber + file and auto-submits edit form. */
  openUploadDocumentDialog(): void {
    const dialogRef = this.dialog.open(UploadDocumentDialogComponent, {
      width: '520px',
      disableClose: false,
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
      technicalContactName: raw['technicalContactName'] as string,
      technicalContactEmail: raw['technicalContactEmail'] as string,
      technicalContactPhone: raw['technicalContactPhone'] as string,
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
