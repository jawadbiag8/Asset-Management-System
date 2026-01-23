import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';

export interface ActiveIncident {
  id: string;
  name: string;
  description: string;
  severityLevel: string;
  status: string;
  assetId?: string;
  assetName?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-active-incidents',
  templateUrl: './active-incidents.component.html',
  styleUrl: './active-incidents.component.scss',
  standalone: false,
})
export class ActiveIncidentsComponent implements OnInit {
  incidents: ActiveIncident[] = [];
  loading = false;
  errorMessage = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadActiveIncidents();
  }

  loadActiveIncidents(): void {
    this.loading = true;
    this.errorMessage = '';

    // Simulate API call delay
    setTimeout(() => {
      this.apiService.get<ActiveIncident[]>('Incident', { Status: 'Active' }).subscribe({
        next: (response: ActiveIncident[]) => {
          this.loading = false;
          if (Array.isArray(response) && response.length > 0) {
            this.incidents = response;
          } else {
            // Load empty state if no incidents
            this.incidents = [];
          }
        },
        error: (error: any) => {
          this.loading = false;
          console.error('Error loading active incidents:', error);
          // Load empty state on error
          this.incidents = [];
        }
      });
    }, 500);
  }
}
