import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  TableConfig,
  TableColumn,
} from '../reusable/reusable-table/reusable-table.component';
import { ApiService } from '../../services/api.service';
import { forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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
  ministryId?: number;
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
export class PmDashboardComponent implements OnInit, OnDestroy {
  currentInsightIndex = signal(0);
  loading = signal(true);

  /** Auto-play interval: har 5 sec next insight; hover par stop */
  private insightAutoPlayInterval: ReturnType<typeof setInterval> | null = null;
  private readonly INSIGHT_AUTO_PLAY_MS = 5000;

  // Card 1: Digital Experience Score (right corner badge = score - 90%, hardcoded)
  digitalExperienceScore = 0;

  // Card 2: Total Assets Being Monitored
  totalAssetsBeingMonitored = 0;
  totalMinistries = 0;

  // Card 3: Digital Assets Are Offline
  digitalAssetsOffline = 0;
  lastChecked = '';

  // Card 4: Ministries meet Compliance standards
  ministriesMeetComplianceStandards = 0;
  complianceThreshold = 0;

  // Card 5: Active Incidents
  activeIncidents = 0;
  resolvedIncidentsLast30Days = 0;

  // Card 6: Assets are vulnerable
  assetsAreVulnerable = 0;
  securityThreshold = 0;

  performanceIndices: PerformanceIndex[] = [];
  totalVisits: number | null = null;
  uniqueVisitors: number | null = null;
  insights: Insight[] = [
    {
      value: '95%',
      subtitle: 'Faster Failure Detection',
      description:
        'System issues are detected 95% faster than the six-month average. This improvement comes from continuous monitoring across digital assets. Detection speed varies across ministries based on monitoring coverage.',
    },
    {
      value: '70%',
      subtitle: 'Faster Resolution',
      description:
        'Incident resolution is 70% faster than baseline. Centralized visibility and severity-based prioritization are key contributors. Operational dependencies slow recovery for some ministries.',
    },
    {
      value: '60%',
      subtitle: 'Fewer Citizen Complaints',
      description:
        'Citizen complaints are down 60% vs. the six-month average. This indicates improved service stability and user experience. Reductions are uneven across ministries, requiring targeted follow-up.',
    },
    {
      value: '50%',
      subtitle: 'Fewer Major Outages',
      description:
        'Major service outages are down 50% vs. last period. Early risk identification prevented major disruptions. A small number of critical assets still account for most outage risk.',
    },
    {
      value: '25%',
      subtitle: 'Higher Digital Adoption',
      description:
        'Digital service usage is up 25% vs. the six-month average. Improved service quality boosted adoption. Adoption gains differ significantly across service categories and ministries.',
    },
    {
      value: '30%',
      subtitle: 'Lower Operational Recovery Cost',
      description:
        'Faster detection and resolution cut recovery costs by 30%. Lower downtime and fewer escalations reduced operational overhead. Cost benefits are highest in high-volume, citizen-facing services.',
    },
    {
      value: '40%',
      subtitle: 'Incidents Prevented Before Impact',
      description:
        'Approximately 40% of incidents were addressed before impacting citizens. Proactive alerts and SLA breach detection enabled early intervention. Prevention rates vary depending on asset criticality and monitoring maturity.',
    },
  ];
  bottomMinistriesData: MinistryData[] = [];
  topMinistriesData: MinistryData[] = [];

  bottomMinistriesTableConfig: TableConfig = {
    columns: [
      {
        key: 'ministry',
        header: 'MINISTRY',
        cellType: 'text',
        primaryField: 'ministry',
        sortable: false,
        width: '50%',
        cellClass: 'ministry-link',
        showIcon: true,
        iconName: 'open_in_new',
        iconUrl: '/Images/PM-Dashboard/arrow-tr.svg',
        onClick: (row: any) => this.navigateToMinistryDetail(row),
      },
      {
        key: 'assets',
        header: 'ASSETS',
        cellType: 'text',
        primaryField: 'assets',
        sortable: false,
        width: '20%',
      },
      {
        key: 'citizenHappiness',
        header: 'CITIZEN HAPPINESS INDEX',
        cellType: 'progress-bar',
        progressValueField: 'percentage',
        // progressColor will use default logic (red < 30%, orange 30-70%, green >= 70%)
        progressShowLabel: true,
        sortable: false,
        width: '30%',
      },
    ],
    data: this.bottomMinistriesData.map((item) => ({
      ministryId: item.ministryId,
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
        sortable: false,
        width: '50%',
        cellClass: 'ministry-link',
        showIcon: true,
        iconName: 'open_in_new',
        iconUrl: '/Images/PM-Dashboard/arrow-tr.svg',
        onClick: (row: any) => this.navigateToMinistryDetail(row),
      },
      {
        key: 'assets',
        header: 'ASSETS',
        cellType: 'text',
        primaryField: 'assets',
        sortable: false,
        width: '20%',
      },
      {
        key: 'compliance',
        header: 'COMPLIANCE INDEX',
        cellType: 'progress-bar',
        progressValueField: 'percentage',
        // progressColor will use default logic (red < 30%, orange 30-70%, green >= 70%)
        progressShowLabel: true,
        sortable: false,
        width: '30%',
      },
    ],
    data: this.topMinistriesData.map((item) => ({
      ministryId: item.ministryId,
      ministry: item.ministry,
      assets: item.assets,
      percentage: item.percentage,
    })),
    serverSideSearch: false,
    emptyStateMessage: 'No data available',
  };

  private emptyInsight: Insight = { value: '', subtitle: '', description: '' };
  currentInsight = signal<Insight>(this.emptyInsight);

  constructor(
    private apiService: ApiService,
    private router: Router,
  ) {
    this.currentInsight.set(this.insights[0] ?? this.emptyInsight);
  }

  ngOnInit(): void {
    this.loadPMDashboardData();
    this.startInsightAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopInsightAutoPlay();
  }

  startInsightAutoPlay(): void {
    this.stopInsightAutoPlay();
    if (this.insights.length <= 1) return;
    this.insightAutoPlayInterval = setInterval(() => {
      this.advanceToNextInsight();
    }, this.INSIGHT_AUTO_PLAY_MS);
  }

  stopInsightAutoPlay(): void {
    if (this.insightAutoPlayInterval != null) {
      clearInterval(this.insightAutoPlayInterval);
      this.insightAutoPlayInterval = null;
    }
  }

  /** Auto-play ke liye: next slide, end pe wapas 0 */
  private advanceToNextInsight(): void {
    const next = (this.currentInsightIndex() + 1) % this.insights.length;
    this.currentInsightIndex.set(next);
    this.currentInsight.set(this.insights[next] ?? this.emptyInsight);
  }

  onInsightsMouseEnter(): void {
    this.stopInsightAutoPlay();
  }

  onInsightsMouseLeave(): void {
    this.startInsightAutoPlay();
  }

  /** Ministry row click: navigate to ministry-detail with ministryId (query param) */
  navigateToMinistryDetail(row: { ministryId?: number }): void {
    const id = row?.ministryId;
    if (id == null) return;
    this.router.navigate(['/ministry-detail'], {
      queryParams: { ministryId: id },
    });
  }

  loadPMDashboardData(): void {
    this.loading.set(true);
    forkJoin({
      dashboard: this.apiService
        .getPMDashboard()
        .pipe(catchError(() => of(null))),
      header: this.apiService
        .getPMDashboardHeader()
        .pipe(catchError(() => of(null))),
      indices: this.apiService
        .getPMDashboardIndices()
        .pipe(catchError(() => of(null))),
      bottomMinistries: this.apiService
        .getPMDashboardBottomMinistries()
        .pipe(catchError(() => of(null))),
      topMinistries: this.apiService
        .getPMDashboardTopMinistries()
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: (res) => {
        if (res.header?.isSuccessful && res.header?.data) {
          this.applyHeaderData(res.header.data);
        }
        if (res.indices?.isSuccessful && res.indices?.data) {
          this.applyIndicesData(res.indices.data);
        }
        if (res.bottomMinistries?.isSuccessful && res.bottomMinistries?.data) {
          this.bottomMinistriesData = this.mapMinistryData(
            res.bottomMinistries.data,
          );
          this.bottomMinistriesTableConfig = {
            ...this.bottomMinistriesTableConfig,
            data: this.bottomMinistriesData.map((item) => ({
              ministryId: item.ministryId,
              ministry: item.ministry,
              assets: item.assets,
              percentage: item.percentage,
            })),
          };
        }
        if (res.topMinistries?.isSuccessful && res.topMinistries?.data) {
          this.topMinistriesData = this.mapMinistryData(res.topMinistries.data);
          this.topMinistriesTableConfig = {
            ...this.topMinistriesTableConfig,
            data: this.topMinistriesData.map((item) => ({
              ministryId: item.ministryId,
              ministry: item.ministry,
              assets: item.assets,
              percentage: item.percentage,
            })),
          };
        }
        if (res.dashboard?.isSuccessful && res.dashboard?.data) {
          this.applyDashboardData(res.dashboard.data);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private applyHeaderData(data: any): void {
    if (data.digitalExperienceScore != null)
      this.digitalExperienceScore = Number(data.digitalExperienceScore);
    // Right corner badge = digitalExperienceScore - 90 (hardcoded), not from API
    if (data.totalAssetsBeingMonitored != null)
      this.totalAssetsBeingMonitored = Number(data.totalAssetsBeingMonitored);
    if (data.totalMinistries != null)
      this.totalMinistries = Number(data.totalMinistries);
    if (data.digitalAssetsOffline != null)
      this.digitalAssetsOffline = Number(data.digitalAssetsOffline);
    if (data.lastChecked != null) this.lastChecked = String(data.lastChecked);
    if (data.ministriesMeetComplianceStandards != null)
      this.ministriesMeetComplianceStandards = Number(
        data.ministriesMeetComplianceStandards,
      );
    if (data.complianceThreshold != null)
      this.complianceThreshold = Number(data.complianceThreshold);
    if (data.activeIncidents != null)
      this.activeIncidents = Number(data.activeIncidents);
    if (data.resolvedIncidentsLast30Days != null)
      this.resolvedIncidentsLast30Days = Number(
        data.resolvedIncidentsLast30Days,
      );
    if (data.assetsAreVulnerable != null)
      this.assetsAreVulnerable = Number(data.assetsAreVulnerable);
    if (data.securityThreshold != null)
      this.securityThreshold = Number(data.securityThreshold);
  }

  /** Returns relative time string for lastChecked, e.g. "3 minutes ago" */
  /** Card 1 right corner badge: API value (65.05) - hardcoded 90% = -24.95% */
  getDigitalScoreBadgeValue(): number {
    const TARGET = 90;
    return this.digitalExperienceScore - TARGET;
  }

  getLastCheckedText(): string {
    if (!this.lastChecked) return '-';
    const date = new Date(this.lastChecked);
    if (isNaN(date.getTime())) return this.lastChecked;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60)
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  private applyDashboardData(data: any): void {
    if (data?.header) this.applyHeaderData(data.header);
    if (data?.indices) this.applyIndicesData(data.indices);
    if (data?.bottomMinistries?.length) {
      this.bottomMinistriesData = this.mapMinistryData(data.bottomMinistries);
      this.bottomMinistriesTableConfig = {
        ...this.bottomMinistriesTableConfig,
        data: this.bottomMinistriesData.map((item) => ({
          ministryId: item.ministryId,
          ministry: item.ministry,
          assets: item.assets,
          percentage: item.percentage,
        })),
      };
    }
    if (data?.topMinistries?.length) {
      this.topMinistriesData = this.mapMinistryData(data.topMinistries);
      this.topMinistriesTableConfig = {
        ...this.topMinistriesTableConfig,
        data: this.topMinistriesData.map((item) => ({
          ministryId: item.ministryId,
          ministry: item.ministry,
          assets: item.assets,
          percentage: item.percentage,
        })),
      };
    }
  }

  private applyIndicesData(data: any): void {
    if (Array.isArray(data)) {
      this.performanceIndices = this.mapIndices(data);
    } else if (data && typeof data === 'object') {
      this.performanceIndices = this.mapIndicesFromObject(data);
      if (data.totalVisits != null) this.totalVisits = Number(data.totalVisits);
      else this.totalVisits = null;
      if (data.uniqueVisitors != null)
        this.uniqueVisitors = Number(data.uniqueVisitors);
      else this.uniqueVisitors = null;
    }
  }

  /** Maps API object { overallComplianceIndex, accessibilityIndex, ... } to PerformanceIndex[] */
  private mapIndicesFromObject(data: any): PerformanceIndex[] {
    const entries: { key: string; label: string }[] = [
      { key: 'overallComplianceIndex', label: 'Overall Compliance Index' },
      { key: 'accessibilityIndex', label: 'Accessibility Index' },
      { key: 'availabilityIndex', label: 'Availability Index' },
      { key: 'navigationIndex', label: 'Navigation Index' },
      { key: 'performanceIndex', label: 'Performance Index' },
      { key: 'securityIndex', label: 'Security Index' },
      { key: 'userExperienceIndex', label: 'User Experience Index' },
    ];
    return entries
      .filter((e) => data[e.key] != null)
      .map((e) => ({
        label: e.label,
        value: Number(data[e.key]),
      }));
  }

  private mapIndices(data: any[]): PerformanceIndex[] {
    return (data || []).map((x: any) => ({
      label: x.label ?? x.name ?? '',
      value: Number(x.value ?? x.percentage ?? 0),
    }));
  }

  /** Formats traffic value: 1000 → 1k, 1_000_000 → 1M, 1_000_000_000 → 1B; null → '-' */
  getTrafficDisplay(value: number | null): string {
    if (value == null) return '-';
    const n = Number(value);
    if (isNaN(n)) return '-';
    if (n >= 1_000_000_000) {
      const b = n / 1_000_000_000;
      return b % 1 === 0 ? `${b}B` : `${b.toFixed(1)}B`;
    }
    if (n >= 1_000_000) {
      const m = n / 1_000_000;
      return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
    }
    if (n >= 1_000) {
      const k = n / 1_000;
      return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
    }
    return String(n);
  }

  /** Maps API items to MinistryData (bottom: ministryName/citizenHappinessIndex, top: ministryName/complianceIndex) */
  private mapMinistryData(data: any[]): MinistryData[] {
    return (data || []).map((x: any) => ({
      ministryId: x.ministryId != null ? Number(x.ministryId) : undefined,
      ministry: x.ministry ?? x.ministryName ?? x.name ?? '',
      assets: Number(x.assets ?? x.assetCount ?? 0),
      percentage: Number(
        x.percentage ??
          x.citizenHappinessIndex ??
          x.citizenHappiness ??
          x.complianceIndex ??
          x.compliance ??
          0,
      ),
    }));
  }

  getIndexColor(value: number): string {
    // Use CSS variables: red < 30%, orange 30-70%, green >= 70%
    if (value >= 70) return 'var(--color-green)'; // Green
    if (value >= 30) return 'var(--color-orange)'; // Orange
    return 'var(--color-red)'; // Red
  }

  getIndexBgColor(value: number): string {
    // Bar track: light shade matching filled color (green → green-light, etc.)
    if (value >= 70) return 'var(--color-green-light)';
    if (value >= 30) return 'var(--color-orange-light)';
    return 'var(--color-red-light)';
  }

  previousInsight(): void {
    if (this.currentInsightIndex() > 0) {
      this.currentInsightIndex.set(this.currentInsightIndex() - 1);
      this.currentInsight.set(
        this.insights[this.currentInsightIndex()] ?? this.emptyInsight,
      );
    }
  }

  nextInsight(): void {
    if (this.currentInsightIndex() < this.insights.length - 1) {
      this.currentInsightIndex.set(this.currentInsightIndex() + 1);
      this.currentInsight.set(
        this.insights[this.currentInsightIndex()] ?? this.emptyInsight,
      );
    }
  }

  goToInsight(index: number): void {
    this.currentInsightIndex.set(index);
    this.currentInsight.set(this.insights[index] ?? this.emptyInsight);
    // Manual click ke baad bhi auto-play dobara chalega (mouseleave pe)
  }
}
