import { Component, OnInit } from '@angular/core';
import { ApiResponse, ApiService } from '../../../services/api.service';

export interface MinistryAsset {
  ministryId: string;
  ministryName: string;
  assetCount: number;
  changeCount?: number;
  changeType?: 'increase' | 'decrease';
}

@Component({
  selector: 'app-assets-by-ministry',
  templateUrl: './assets-by-ministry.component.html',
  styleUrl: './assets-by-ministry.component.scss',
  standalone: false,
})
export class AssetsByMinistryComponent implements OnInit {
  ministries: MinistryAsset[] = [];
  loading = false;
  errorMessage = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadMinistryAssets();
  }

  loadMinistryAssets(): void {
    this.loading = true;
    this.errorMessage = '';

    // Simulate API call delay
    setTimeout(() => {
      this.apiService.getAssets().subscribe({
        next: (response: ApiResponse<MinistryAsset[]>) => {
          this.loading = false;
          if (response.isSuccessful && response.data) {
            this.ministries = response.data;
          } else {
            this.errorMessage = response.message || 'Failed to load ministry assets';
          }
        },
      });
    }, 500);
  }

  loadDummyData(): void {
    this.ministries = [
      {
        ministryId: '2',
        ministryName: 'Ministry of Maritime Affairs',
        assetCount: 7,
        changeCount: 1,
        changeType: 'increase'
      },
      {
        ministryId: '3',
        ministryName: 'Ministry of Planning, Development & Special Initiatives',
        assetCount: 6,
        changeCount: 1,
        changeType: 'increase'
      },
      {
        ministryId: '4',
        ministryName: 'Ministry of Science & Technology',
        assetCount: 3,
        changeCount: -1,
        changeType: 'decrease'
      },
      {
        ministryId: '5',
        ministryName: 'Ministry of Finance',
        assetCount: 4,
        changeCount: 2,
        changeType: 'increase'
      }
    ];
    this.loading = false;
  }

  viewDetails(ministryId: string): void {
    // Navigate to ministry details or filter assets by ministry
    console.log('View details for ministry:', ministryId);
    // TODO: Implement navigation or filtering
  }

  addDigitalAsset(): void {
    // Navigate to add asset page or open modal
    console.log('Add digital asset clicked');
    // TODO: Implement add asset functionality
  }
}
