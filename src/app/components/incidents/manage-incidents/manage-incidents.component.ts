import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { ApiResponse, ApiService } from '../../../services/api.service';
import { UtilsService } from '../../../services/utils.service';

export interface IncidentRequest {
  incidentTitle: string;
  assetId: string;
  kpiId: string;
  securityLevel: string;
  description: string;
}

@Component({
  selector: 'app-manage-incidents',
  templateUrl: './manage-incidents.component.html',
  styleUrl: './manage-incidents.component.scss',
  standalone: false,
})
export class ManageIncidentsComponent implements OnInit {
  incidentForm!: FormGroup;
  loading = false;

  // Options for dropdowns
  assetOptions: { label: string, value: string }[] = [];
  kpiOptions: { label: string, value: string }[] = [];
  securityLevels: { label: string, value: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private utils: UtilsService,
    public dialogRef: MatDialogRef<ManageIncidentsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { assetId: string, kpiId: string }
  ) { }

  ngOnInit(): void {
    this.createForm();
    this.loadAssetsAndKpis();
  }

  loadAssetsAndKpis(): void {
    forkJoin({
      assets: this.api.getAllAssets(),
      kpis: this.api.getAllKpis(),
      securityLevels: this.api.getLovByType('citizenImpactLevel')
    }).subscribe({
      next: (responses: { assets: ApiResponse<any[]>, kpis: ApiResponse<any[]>, securityLevels: ApiResponse<any[]> }) => {
        this.assetOptions = responses.assets.data?.map((asset: any) => ({
          label: asset.name,
          value: asset.id.toString()
        })) || [];

        if (this.data.assetId) {
          this.incidentForm.patchValue({
            assetId: this.data.assetId,
          });
        }

        this.kpiOptions = responses.kpis.data?.map((kpi: any) => ({
          label: kpi.name,
          value: kpi.id.toString()
        })) || [];

        if (this.data.kpiId) {
          this.incidentForm.patchValue({
            kpiId: this.data.kpiId,
          });
        }

        this.securityLevels = responses.securityLevels.data?.map((securityLevel: any) => ({
          label: securityLevel.name,
          value: securityLevel.id.toString()
        })) || [];



      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error loading data', 'error');
        this.assetOptions = [];
        this.kpiOptions = [];
        this.securityLevels = [];
      }
    });
  }

  createForm(): void {
    this.incidentForm = this.fb.group({
      incidentTitle: ['', Validators.required],
      assetId: [this.data.assetId || '', Validators.required],
      kpiId: [this.data.kpiId || '', Validators.required],
      securityLevel: ['', Validators.required],
      description: [''],
      status: [''],
    });
  }


  onSubmit(): void {
    if (this.incidentForm.invalid) {
      this.incidentForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue: IncidentRequest = this.incidentForm.value;

    this.api.addIncident(formValue).subscribe({
      next: (res: ApiResponse) => {
        this.loading = false;
        if (res.isSuccessful) {
          this.utils.showToast(res.message, 'Incident added successfully', 'success');
          this.dialogRef.close(true); // Close modal and return true to indicate success
        } else {
          this.utils.showToast(res.message, 'Error adding incident', 'error');
        }
      },
      error: (error: any) => {
        this.loading = false;
        this.utils.showToast(error, 'Error adding incident', 'error');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  // Helper method to get form control
  getControl(controlName: string): FormControl {
    return this.incidentForm.get(controlName) as FormControl;
  }
}
