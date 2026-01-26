import { Component, signal, computed, OnInit } from '@angular/core';
import {
  TableConfig,
  TableColumn,
  FilterPill,
} from '../reusable/reusable-table/reusable-table.component';
import { ApiService } from '../../services/api.service';
import { HttpParams } from '@angular/common/http';

export interface DigitalAsset {
  id: number;
  ministry: string;
  department: string;
  websiteName: string;
  websiteUrl: string;
  currentHealthStatus: string;
  currentHealthPercentage: string;
  lastOutageStatus: string;
  lastOutageUpdated: string;
  performanceSlaStatus: string;
  performanceSlaPercentage: string;
  complianceStatus: string;
  compliancePercentage: string;
  contentFreshnessStatus: string;
  contentFreshnessUpdated: string;
  citizenImpactLevel: string;
  satisfaction: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: false,
})
export class DashboardComponent implements OnInit {
  constructor(private apiService: ApiService) { }

  tableFilters = signal<FilterPill[]>([
    {
      id: 'ministry',
      label: 'Ministry: Health',
      value: 'Health',
      removable: true,
      paramKey: 'ministry',
      options: [
        { label: 'All', value: 'All' },
        { label: 'Finance', value: 'Finance' },
        { label: 'Transport', value: 'Transport' },
        { label: 'Health', value: 'Health' },
        { label: 'Education', value: 'Education' },
        { label: 'Housing', value: 'Housing' },
      ],
    },
    {
      id: 'status',
      label: 'Status: All',
      value: 'All',
      paramKey: 'status',
      options: [
        { label: 'All', value: 'All' },
        { label: 'Offline', value: 'Offline' },
        { label: 'Online', value: 'Online' },
      ],
    },
    {
      id: 'riskRating',
      label: 'Risk Rating: All',
      value: 'All',
      paramKey: 'riskRating',
      options: [
        { label: 'All', value: 'All' },
        { label: 'Amber', value: 'Amber' },
        { label: 'Green', value: 'Green' },
        { label: 'Red', value: 'Red' },
      ],
    },
    {
      id: 'incidents',
      label: 'Incidents: All',
      value: 'All',
      paramKey: 'incidents',
      options: [
        { label: 'All', value: 'All' },
        { label: 'P3', value: 'P3' },
        { label: 'P2', value: 'P2' },
        { label: 'None', value: 'None' },
      ],
    },
  ]);

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    searchPlaceholder: 'Search assets',
    serverSideSearch: true, // Enable server-side search
    defaultPageSize: 10, // Default page size
    columns: [
      {
        key: 'analyze',
        header: 'ANALYZE',
        cellType: 'icon',
        iconName: 'bar_chart',
        iconColor: 'var(--color-blue-dark)',
        iconBgColor: 'var(--color-blue-light)',
        sortable: true,
      },
      {
        key: 'ministryDepartment',
        header: 'MINISTRY / DEPARTMENT',
        cellType: 'two-line',
        primaryField: 'ministry',
        secondaryField: 'department',
        sortable: true,
      },
      {
        key: 'websiteApplication',
        header: 'WEBSITE / APPLICATION',
        cellType: 'link',
        primaryField: 'websiteName',
        linkField: 'websiteUrl',
        sortable: true,
      },
      {
        key: 'currentHealth',
        header: 'CURRENT HEALTH',
        cellType: 'two-line',
        primaryField: 'currentHealthStatus',
        secondaryField: 'currentHealthPercentage',
        sortable: true,
      },
      {
        key: 'lastOutage',
        header: 'LAST OUTAGE',
        cellType: 'two-line',
        primaryField: 'lastOutageStatus',
        secondaryField: 'lastOutageUpdated',
        sortable: true,
      },
      {
        key: 'performanceSla',
        header: 'PERFORMANCE SLA',
        cellType: 'badge-with-subtext',
        badgeField: 'performanceSlaStatus',
        subtextField: 'performanceSlaPercentage',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true,
      },
      {
        key: 'complianceStatus',
        header: 'COMPLIANCE STATUS',
        cellType: 'text-with-color',
        primaryField: 'complianceStatus',
        secondaryField: 'compliancePercentage',
        textColor: 'success',
        sortable: true,
      },
      {
        key: 'contentFreshness',
        header: 'CONTENT FRESHNESS',
        cellType: 'two-line',
        primaryField: 'contentFreshnessStatus',
        secondaryField: 'contentFreshnessUpdated',
        sortable: true,
      },
      {
        key: 'citizenImpactLevel',
        header: 'CITIZEN IMPACT LEVEL',
        cellType: 'badge-with-subtext',
        badgeField: 'citizenImpactLevel',
        subtextField: 'satisfaction',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true,
      },
    ],
    data: [],
  });

  digitalAssets = signal<DigitalAsset[]>([
    {
      id: 1,
      ministry: 'Ministry of Planning, Development & Special Initiatives',
      department: 'National Engineering Services Pakistan (Pvt.) Limited',
      websiteName: 'Ministry Website',
      websiteUrl: 'https://nespak.com.pk',
      currentHealthStatus: 'Unknown',
      currentHealthPercentage: '0.00%',
      lastOutageStatus: 'Never',
      lastOutageUpdated: 'Last Updated',
      performanceSlaStatus: 'MET',
      performanceSlaPercentage: '0%',
      complianceStatus: 'Compliant',
      compliancePercentage: '100%',
      contentFreshnessStatus: 'Never',
      contentFreshnessUpdated: 'Last Updated',
      citizenImpactLevel: 'LOW',
      satisfaction: 'Satisfaction: N/A',
    },
    {
      id: 2,
      ministry: 'Ministry of Planning, Development & Special Initiatives',
      department: 'National Engineering Services Pakistan (Pvt.) Limited',
      websiteName: 'Ministry Website',
      websiteUrl: 'https://nespak.com.pk',
      currentHealthStatus: 'Unknown',
      currentHealthPercentage: '0.00%',
      lastOutageStatus: 'Never',
      lastOutageUpdated: 'Last Updated',
      performanceSlaStatus: 'MET',
      performanceSlaPercentage: '0%',
      complianceStatus: 'Compliant',
      compliancePercentage: '100%',
      contentFreshnessStatus: 'Never',
      contentFreshnessUpdated: 'Last Updated',
      citizenImpactLevel: 'LOW',
      satisfaction: 'Satisfaction: N/A',
    },
    {
      id: 3,
      ministry: 'Ministry of Planning, Development & Special Initiatives',
      department: 'National Engineering Services Pakistan (Pvt.) Limited',
      websiteName: 'Ministry Website',
      websiteUrl: 'https://nespak.com.pk',
      currentHealthStatus: 'Unknown',
      currentHealthPercentage: '0.00%',
      lastOutageStatus: 'Never',
      lastOutageUpdated: 'Last Updated',
      performanceSlaStatus: 'MET',
      performanceSlaPercentage: '0%',
      complianceStatus: 'Compliant',
      compliancePercentage: '100%',
      contentFreshnessStatus: 'Never',
      contentFreshnessUpdated: 'Last Updated',
      citizenImpactLevel: 'LOW',
      satisfaction: 'Satisfaction: N/A',
    },
    {
      id: 4,
      ministry: 'Ministry of Planning, Development & Special Initiatives',
      department: 'National Engineering Services Pakistan (Pvt.) Limited',
      websiteName: 'Ministry Website',
      websiteUrl: 'https://nespak.com.pk',
      currentHealthStatus: 'Unknown',
      currentHealthPercentage: '0.00%',
      lastOutageStatus: 'Never',
      lastOutageUpdated: 'Last Updated',
      performanceSlaStatus: 'MET',
      performanceSlaPercentage: '0%',
      complianceStatus: 'Compliant',
      compliancePercentage: '100%',
      contentFreshnessStatus: 'Never',
      contentFreshnessUpdated: 'Last Updated',
      citizenImpactLevel: 'LOW',
      satisfaction: 'Satisfaction: N/A',
    },
    {
      id: 5,
      ministry: 'Ministry of Planning, Development & Special Initiatives',
      department: 'National Engineering Services Pakistan (Pvt.) Limited',
      websiteName: 'Ministry Website',
      websiteUrl: 'https://nespak.com.pk',
      currentHealthStatus: 'Unknown',
      currentHealthPercentage: '0.00%',
      lastOutageStatus: 'Never',
      lastOutageUpdated: 'Last Updated',
      performanceSlaStatus: 'MET',
      performanceSlaPercentage: '0%',
      complianceStatus: 'Compliant',
      compliancePercentage: '100%',
      contentFreshnessStatus: 'Never',
      contentFreshnessUpdated: 'Last Updated',
      citizenImpactLevel: 'LOW',
      satisfaction: 'Satisfaction: N/A',
    },
  ]);

  // Computed signal to keep table config in sync with data
  tableConfigWithData = computed<TableConfig>(() => ({
    ...this.tableConfig(),
    data: this.digitalAssets(),
  }));

  dashboardKpis = signal<{ isVisible: boolean; data: any[] }>({
    isVisible: true,
    data: [
      {
        id: 1,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month',
      },
      {
        id: 2,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month',
      },
      {
        id: 3,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month',
      },
      {
        id: 4,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month',
      },
      {
        id: 5,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month',
      },
      {
        id: 6,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'not-success',
        subValueText: '+12 Assets from last month',
      },
      {
        id: 7,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month',
      },
    ],
  });

  ngOnInit() {
    // Initial data will be loaded by table component on init
  }

  loadAssets(searchParams: HttpParams) {
    this.apiService.getAssets(searchParams).subscribe({
      next: (response) => {
        if (response.isSuccessful && response.data) {
          this.digitalAssets.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading assets:', error);
      },
    });
  }


  onGridIconClick() {
    this.dashboardKpis.update((kpis) => ({
      ...kpis,
      isVisible: !kpis.isVisible,
    }));
  }
}
