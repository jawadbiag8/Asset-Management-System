import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { BreadcrumbItem } from '../reusable/reusable-breadcrum/reusable-breadcrum.component';
import { ApiResponse, ApiService } from '../../services/api.service';
import { UtilsService } from '../../services/utils.service';
import { CanComponentDeactivate } from '../../guards/can-deactivate.guard';

export interface DigitalAssetRequest {
  ministryId: number;
  departmentId: number;
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
  }>({
    pageState: null,
    title: '',
    subtitle: ''
  });

  digitalAssetForm!: FormGroup;

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Add Digital Assets' }
  ];

  ministryOptions: { label: string, value: number }[] = [];
  departments: { label: string, value: number }[] = [];
  citizenImpactLevelOptions: { label: string, value: number }[] = [];


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

  constructor(
    private route: Router,
    private fb: FormBuilder,
    private api: ApiService,
    private utils: UtilsService
  ) { }

  ngOnInit() {
    this.createForm();

    this.pageInfo.set({
      pageState: this.route.url === '/add-digital-assets' ? 'add' : 'edit',
      title: this.route.url === '/add-digital-assets' ? 'Add New Digital Asset' : 'Edit Digital Asset',
      subtitle: this.route.url === '/add-digital-assets' ? 'Fill in the details below to add a new digital asset to the monitoring system' : 'Fill in the details below to update existing digital asset to the monitoring system'
    });

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
      description: [''],
      primaryContactName: ['', Validators.required],
      primaryContactEmail: ['', Validators.required, Validators.email],
      primaryContactPhone: ['', Validators.required],
      technicalContactName: ['', Validators.required],
      technicalContactEmail: ['', Validators.required, Validators.email],
      technicalContactPhone: ['', Validators.required],

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


  onSubmit() {
    if (this.digitalAssetForm.invalid) {
      this.digitalAssetForm.markAllAsTouched();
      return;
    }

    this.api.addAsset(this.digitalAssetForm.value).subscribe({
      next: (res: ApiResponse) => {
        if (res.isSuccessful) {
          this.utils.showToast(res.message, 'Asset added successfully', 'success');
          // Mark form as pristine to allow navigation without confirmation
          this.digitalAssetForm.markAsPristine();
          this.route.navigate(['/dashboard']);
        } else {
          this.utils.showToast(res.message, 'Error adding asset', 'error');
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error adding asset', 'error');
      }
    });
  }

  // Helper method to get form control
  getControl(controlName: string): FormControl {
    return this.digitalAssetForm.get(controlName) as FormControl;
  }

  // CanDeactivate implementation
  canDeactivate(): boolean {
    // Check if form has been modified (dirty) or touched
    if (this.digitalAssetForm.dirty || this.digitalAssetForm.touched) {
      // Form has unsaved changes
      return false;
    }
    // Form is clean, allow navigation
    return true;
  }

}
