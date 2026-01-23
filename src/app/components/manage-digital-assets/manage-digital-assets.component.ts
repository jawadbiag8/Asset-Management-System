import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-manage-digital-assets',
  templateUrl: './manage-digital-assets.component.html',
  styleUrl: './manage-digital-assets.component.scss',
  standalone: false,
})
export class ManageDigitalAssetsComponent implements OnInit {

  pageInfo = signal<{
    pageState: 'add' | 'edit' | null;
    title: string;
    subtitle: string;
  }>({
    pageState: null,
    title: 'Manage Digital Assets',
    subtitle: 'Manage your digital assets'
  });

  digitalAssetForm: FormGroup;

  ministries = [
    'Ministry of Health',
    'Ministry of Education',
    'Ministry of Planning, Development & Special Initiatives',
    'Ministry of Finance'
  ];

  monitoringFrequencies = [
    'Every 1 minute',
    'Every 5 minutes',
    'Every 15 minutes',
    'Every 30 minutes',
    'Every 1 hour'
  ];

  constructor(
    private route: Router,
    private fb: FormBuilder
  ) {
    this.digitalAssetForm = this.fb.group({
      ministry: ['', Validators.required],
      department: ['', Validators.required],
      websiteName: ['', Validators.required],
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      performanceSlaTarget: ['99', [Validators.required, Validators.min(0), Validators.max(100)]],
      monitoringFrequency: ['Every 5 minutes', Validators.required]
    });
  }

  ngOnInit() {
    this.pageInfo.set({
      pageState: this.route.url === '/add-digital-assets' ? 'add' : 'edit',
      title: this.route.url === '/add-digital-assets' ? 'Add New Digital Asset' : 'Edit Digital Asset',
      subtitle: this.route.url === '/add-digital-assets' ? 'Fill in the details below to add a new digital asset to the monitoring system' : 'Fill in the details below to update existing digital asset to the monitoring system'
    });
  }

  onSubmit() {
    if (this.digitalAssetForm.valid) {
      console.log('Form submitted:', this.digitalAssetForm.value);
      // Handle form submission
    } else {
      this.digitalAssetForm.markAllAsTouched();
    }
  }

}
