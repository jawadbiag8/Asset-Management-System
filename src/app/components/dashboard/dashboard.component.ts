import { Component, signal, computed } from '@angular/core';
import { TableConfig, TableColumn, FilterPill } from '../reusable/reusable-table/reusable-table.component';

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
export class DashboardComponent {

  searchValue = signal<string>('');
  tableFilters = signal<FilterPill[]>([
    {
      id: 'ministry',
      label: 'Ministry: Health',
      value: 'Health',
      type: 'selected',
      removable: true
    },
    {
      id: 'status',
      label: 'Status: All',
      value: 'All',
      type: 'dropdown'
    },
    {
      id: 'riskRating',
      label: 'Risk Rating: All',
      value: 'All',
      type: 'dropdown'
    },
    {
      id: 'incidents',
      label: 'Incidents: All',
      value: 'All',
      type: 'dropdown'
    }
  ]);

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    searchPlaceholder: 'Search assets',
    columns: [
      {
        key: 'analyze',
        header: 'ANALYZE',
        cellType: 'icon',
        iconName: 'bar_chart',
        iconColor: 'var(--color-blue-dark)',
        iconBgColor: 'var(--color-blue-light)',
        sortable: true
      },
      {
        key: 'ministryDepartment',
        header: 'MINISTRY / DEPARTMENT',
        cellType: 'two-line',
        primaryField: 'ministry',
        secondaryField: 'department',
        sortable: true
      },
      {
        key: 'websiteApplication',
        header: 'WEBSITE / APPLICATION',
        cellType: 'link',
        primaryField: 'websiteName',
        linkField: 'websiteUrl',
        sortable: true
      },
      {
        key: 'currentHealth',
        header: 'CURRENT HEALTH',
        cellType: 'two-line',
        primaryField: 'currentHealthStatus',
        secondaryField: 'currentHealthPercentage',
        sortable: true
      },
      {
        key: 'lastOutage',
        header: 'LAST OUTAGE',
        cellType: 'two-line',
        primaryField: 'lastOutageStatus',
        secondaryField: 'lastOutageUpdated',
        sortable: true
      },
      {
        key: 'performanceSla',
        header: 'PERFORMANCE SLA',
        cellType: 'badge-with-subtext',
        badgeField: 'performanceSlaStatus',
        subtextField: 'performanceSlaPercentage',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true
      },
      {
        key: 'complianceStatus',
        header: 'COMPLIANCE STATUS',
        cellType: 'text-with-color',
        primaryField: 'complianceStatus',
        secondaryField: 'compliancePercentage',
        textColor: 'success',
        sortable: true
      },
      {
        key: 'contentFreshness',
        header: 'CONTENT FRESHNESS',
        cellType: 'two-line',
        primaryField: 'contentFreshnessStatus',
        secondaryField: 'contentFreshnessUpdated',
        sortable: true
      },
      {
        key: 'citizenImpactLevel',
        header: 'CITIZEN IMPACT LEVEL',
        cellType: 'badge-with-subtext',
        badgeField: 'citizenImpactLevel',
        subtextField: 'satisfaction',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true
      }
    ],
    data: []
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
      satisfaction: 'Satisfaction: N/A'
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
      satisfaction: 'Satisfaction: N/A'
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
      satisfaction: 'Satisfaction: N/A'
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
      satisfaction: 'Satisfaction: N/A'
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
      satisfaction: 'Satisfaction: N/A'
    }
  ]);

  // Computed signal to keep table config in sync with data
  tableConfigWithData = computed<TableConfig>(() => ({
    ...this.tableConfig(),
    data: this.digitalAssets()
  }));

  dashboardKpis = signal<{isVisible: boolean, data: any[]}>({
    isVisible: true,
    data: [
      {
        id: 1,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month'
      },
      {
        id: 2,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month'
      },
      {
        id: 3,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month'
      },
      {
        id: 4,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month'
      },
      {
        id: 5,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month'
      },
      {
        id: 6,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'not-success',
        subValueText: '+12 Assets from last month'
      },
      {
        id: 7,
        title: 'Total  Digital Assets Monitored',
        subTitle: 'Active monitoring across all departments',
        value: '247',
        subValue: '+12',
        subValueColor: 'success',
        subValueText: '+12 Assets from last month'
      }
    ]
  });

  onSearchChange(value: string) {
    this.searchValue.set(value);
    // Add your search filtering logic here
  }

  onFilterRemove(filterId: string) {
    this.tableFilters.update(filters =>
      filters.filter(f => f.id !== filterId)
    );
    // Add your filter removal logic here
  }

  onFilterClick(filterId: string) {
    // Add your filter dropdown logic here
    console.log('Filter clicked:', filterId);
  }

  onGridIconClick() {
    this.dashboardKpis.update(kpis => ({
      ...kpis,
      isVisible: !kpis.isVisible
    }));
  }

}
