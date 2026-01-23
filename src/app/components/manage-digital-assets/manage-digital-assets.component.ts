import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';

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
    title: '',
    subtitle: ''
  });

  digitalAssetForm: FormGroup;

  ministryOptions = [{ label: 'Ministry of Health', value: 'Ministry of Health' },
  { label: 'Ministry of Education', value: 'Ministry of Education' },
  { label: 'Ministry of Planning, Development & Special Initiatives', value: 'Ministry of Planning, Development & Special Initiatives' },
  { label: 'Ministry of Finance', value: 'Ministry of Finance' }

  ];

  citizenImpactLevelOptions = [{ label: 'LOW', value: 'LOW' }, { label: 'MEDIUM', value: 'MEDIUM' }, { label: 'HIGH', value: 'HIGH' }];


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
    private fb: FormBuilder
  ) {
    this.digitalAssetForm = this.fb.group({
      // Basic Information
      ministry: ['', Validators.required],
      department: ['', Validators.required],
      websiteName: ['', Validators.required],
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],

      // Compliance Configuration
      citizenImpactLevel: ['', Validators.required],

      // Additional Information
      description: [''],
      primaryContact: ['', Validators.required],
      secondaryContact: ['', Validators.required],
      primaryContactEmail: ['', Validators.required, Validators.email],
      secondaryContactEmail: ['', Validators.required, Validators.email],

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
    console.log('Form Before:', this.digitalAssetForm.value);

    if (this.digitalAssetForm.invalid) {
      this.digitalAssetForm.markAllAsTouched();
      return;
    }

    console.log('Form submitted:', this.digitalAssetForm.value);
    // Handle form submission
  }

  // Helper method to get form control
  getControl(controlName: string): FormControl {
    return this.digitalAssetForm.get(controlName) as FormControl;
  }

}
