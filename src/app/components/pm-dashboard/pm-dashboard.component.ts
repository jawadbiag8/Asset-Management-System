import { Component, signal } from '@angular/core';
import {
  TableConfig,
  TableColumn,
} from '../reusable/reusable-table/reusable-table.component';

interface PerformanceIndex {
  label: string;
  value: number;
}

interface Insight {
  value: string;
  subtitle: string;
  description: string;
}

interface MinistryData {
  ministry: string;
  assets: number;
  percentage: number;
}

@Component({
  selector: 'app-pm-dashboard',
  templateUrl: './pm-dashboard.component.html',
  styleUrl: './pm-dashboard.component.scss',
  standalone: false,
})
export class PmDashboardComponent {
  currentInsightIndex = signal(0);

  performanceIndices: PerformanceIndex[] = [
    { label: 'Overall Compliance Index', value: 85 },
    { label: 'Accessibility Index', value: 29 },
    { label: 'Availability Index', value: 73 },
    { label: 'Navigation Index', value: 67 },
    { label: 'Performance Index', value: 94 },
    { label: 'Security Index', value: 73 },
    { label: 'User Experience Index', value: 81 },
  ];

  insights: Insight[] = [
    {
      value: '95%',
      subtitle: 'Faster Failure Detection',
      description:
        'System issues are detected 95% faster than the six-month average. This improvement comes from continuous monitoring across digital assets. Detection speed varies across ministries based on monitoring coverage.',
    },
    {
      value: '78%',
      subtitle: 'Citizen Satisfaction',
      description:
        'Overall citizen satisfaction has improved by 78% over the past quarter. This reflects better service delivery and improved digital infrastructure.',
    },
    {
      value: '524',
      subtitle: 'Total Assets Monitored',
      description:
        'We are currently monitoring 524 digital assets across all ministries and departments, ensuring comprehensive coverage of critical services.',
    },
  ];

  bottomMinistriesData: MinistryData[] = [
    { ministry: 'Ministry of Water Resources', assets: 5, percentage: 29 },
    { ministry: 'Ministry of Industries and Production', assets: 5, percentage: 27 },
    { ministry: 'Ministry of Communications', assets: 5, percentage: 22 },
    { ministry: 'Ministry of Law and Justice', assets: 5, percentage: 18 },
    { ministry: 'Ministry of Housing and Works', assets: 5, percentage: 12 },
  ];

  topMinistriesData: MinistryData[] = [
    { ministry: 'Ministry of Health', assets: 5, percentage: 98 },
    { ministry: 'Ministry of Communications', assets: 5, percentage: 94 },
    { ministry: 'Ministry of Maritime Affairs', assets: 5, percentage: 88 },
    { ministry: 'Ministry of Science & Technology', assets: 5, percentage: 84 },
    { ministry: 'Ministry of Foreign Affairs', assets: 5, percentage: 81 },
  ];

  bottomMinistriesTableConfig: TableConfig = {
    columns: [
      {
        key: 'ministry',
        header: 'MINISTRY',
        cellType: 'text',
        primaryField: 'ministry',
        sortable: true,
        width: '50%',
        cellClass: 'ministry-link',
        showIcon: true,
        iconName: 'open_in_new',
        onClick: (row: any) => {
          // Handle ministry click navigation
          console.log('Ministry clicked:', row.ministry);
        },
      },
      {
        key: 'assets',
        header: 'ASSETS',
        cellType: 'text',
        primaryField: 'assets',
        sortable: true,
        width: '20%',
      },
      {
        key: 'citizenHappiness',
        header: 'CITIZEN HAPPINESS INDEX',
        cellType: 'progress-bar',
        progressValueField: 'percentage',
        // progressColor will use default logic (red < 30%, orange 30-70%, green >= 70%)
        progressShowLabel: true,
        sortable: true,
        width: '30%',
      },
    ],
    data: this.bottomMinistriesData.map((item) => ({
      ministry: item.ministry,
      assets: item.assets,
      percentage: item.percentage,
    })),
    serverSideSearch: false,
    emptyStateMessage: 'No data available',
  };

  topMinistriesTableConfig: TableConfig = {
    columns: [
      {
        key: 'ministry',
        header: 'MINISTRY',
        cellType: 'text',
        primaryField: 'ministry',
        sortable: true,
        width: '50%',
        cellClass: 'ministry-link',
        showIcon: true,
        iconName: 'open_in_new',
        onClick: (row: any) => {
          // Handle ministry click navigation
          console.log('Ministry clicked:', row.ministry);
        },
      },
      {
        key: 'assets',
        header: 'ASSETS',
        cellType: 'text',
        primaryField: 'assets',
        sortable: true,
        width: '20%',
      },
      {
        key: 'compliance',
        header: 'COMPLIANCE INDEX',
        cellType: 'progress-bar',
        progressValueField: 'percentage',
        // progressColor will use default logic (red < 30%, orange 30-70%, green >= 70%)
        progressShowLabel: true,
        sortable: true,
        width: '30%',
      },
    ],
    data: this.topMinistriesData.map((item) => ({
      ministry: item.ministry,
      assets: item.assets,
      percentage: item.percentage,
    })),
    serverSideSearch: false,
    emptyStateMessage: 'No data available',
  };

  currentInsight = signal<Insight>(this.insights[0]);

  constructor() {
    this.currentInsight.set(this.insights[0]);
  }

  getIndexColor(value: number): string {
    // Use CSS variables: red < 30%, orange 30-70%, green >= 70%
    if (value >= 70) return 'var(--color-green)'; // Green
    if (value >= 30) return 'var(--color-orange)'; // Orange
    return 'var(--color-red)'; // Red
  }

  previousInsight(): void {
    if (this.currentInsightIndex() > 0) {
      this.currentInsightIndex.set(this.currentInsightIndex() - 1);
      this.currentInsight.set(this.insights[this.currentInsightIndex()]);
    }
  }

  nextInsight(): void {
    if (this.currentInsightIndex() < this.insights.length - 1) {
      this.currentInsightIndex.set(this.currentInsightIndex() + 1);
      this.currentInsight.set(this.insights[this.currentInsightIndex()]);
    }
  }

  goToInsight(index: number): void {
    this.currentInsightIndex.set(index);
    this.currentInsight.set(this.insights[index]);
  }
}
