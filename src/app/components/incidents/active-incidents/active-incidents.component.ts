import { Component, OnInit, signal } from '@angular/core';
import { ApiResponse, ApiService } from '../../../services/api.service';
import { BreadcrumbItem } from '../../reusable/reusable-breadcrum/reusable-breadcrum.component';
import { HttpParams } from '@angular/common/module.d-CnjH8Dlt';
import { UtilsService } from '../../../services/utils.service';

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
  incidents = signal<ActiveIncident[]>([]);
  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Incidents' }
  ];

  constructor(private apiService: ApiService, private utils: UtilsService) { }

  ngOnInit(): void { }

  loadIncidents(searchQuery: HttpParams): void {
    this.apiService.getIncidents(searchQuery).subscribe({
      next: (response: ApiResponse<ActiveIncident[]>) => {
        if (response.isSuccessful) {
          this.incidents.set(response.data || []);
        } else {
          this.utils.showToast(response.message, 'Error loading incidents', 'error');
          this.incidents.set([]);
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error loading incidents', 'error');
        this.incidents.set([]);
      }
    });
  }
}
