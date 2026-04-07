import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-manage-services',
  templateUrl: './manage-services.component.html',
  styleUrl: './manage-services.component.scss',
  standalone: false,
})
export class ManageServicesComponent implements OnInit {
  pageTitle = signal('Create New Service');
  pageSubtitle = signal(
    'Fill in the details below to create a new service. API integration for submit will be connected next.',
  );

  serviceForm!: FormGroup;

  serviceTypeOptions: { label: string; value: string }[] = [
    { label: 'Citizen Facing', value: 'Citizen Facing' },
    { label: 'Internal', value: 'Internal' },
  ];

  serviceModeOptions: { label: string; value: string }[] = [
    { label: 'Digital', value: 'Digital' },
    { label: 'Manual', value: 'Manual' },
    { label: 'Hybrid', value: 'Hybrid' },
  ];

  statusOptions: { label: string; value: string }[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.serviceForm = this.fb.group({
      serviceName: ['', Validators.required],
      description: [''],
      serviceType: ['', Validators.required],
      serviceMode: ['', Validators.required],
      status: ['Active', Validators.required],
      assetsCount: [0, [Validators.required, Validators.min(0)]],
      stepsCount: [0, [Validators.required, Validators.min(0)]],
      digitalMaturity: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  getControl(controlName: string): FormControl {
    return this.serviceForm.get(controlName) as FormControl;
  }

  onCancel(): void {
    this.router.navigate(['/ministry-detail']);
  }

  onCreateService(): void {
    this.serviceForm.markAllAsTouched();
    if (this.serviceForm.invalid) return;
    // UI-only screen for now; API integration will be added in next step.
    this.router.navigate(['/ministry-detail']);
  }
}
