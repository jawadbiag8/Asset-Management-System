import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type Highcharts from 'highcharts/esm/highcharts';
import { HighchartsChartComponent } from 'highcharts-angular';
import { ApiResponse, ApiService, ServiceAnalyticsData } from '../../services/api.service';

@Component({
  selector: 'app-service-analytics',
  standalone: true,
  imports: [CommonModule, HighchartsChartComponent],
  templateUrl: './service-analytics.component.html',
  styleUrl: './service-analytics.component.scss',
})
export class ServiceAnalyticsComponent implements OnInit {
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly serviceId = signal<number | null>(null);
  readonly data = signal<ServiceAnalyticsData | null>(null);

  readonly headerTitle = computed(() => this.data()?.serviceName || 'Service Analytics');
  readonly ministryLabel = computed(() => this.data()?.ministryName || 'N/A');
  readonly serviceMetaLine = computed(() => {
    const ministry = this.data()?.ministryName || 'N/A';
    const mapped = this.data()?.assetMappedCount ?? 0;
    return `Service / ${ministry} / ${mapped} Linked Assets`;
  });
  readonly mappedAssetsLabel = computed(() => `${this.data()?.assetMappedCount ?? 0} mapped assets`);
  readonly adoptionProgress = computed(() => this.toPercent(this.data()?.adoptionPercentage));
  readonly adoptionPercentLabel = computed(() => this.data()?.adoptionPercentage || `${this.adoptionProgress()}%`);
  readonly adoptionCountLabel = computed(() => {
    const fromCount = this.data()?.adoptionCount;
    const fallback = this.data()?.adoption ?? 0;
    return Number(fromCount ?? fallback);
  });

  readonly submissionChartOptions = computed<Highcharts.Options>(() => {
    const rows = this.data()?.submissionEventsTrend ?? [];
    const categories = rows.map((r) => this.toShortDate(r.date));
    const success = rows.map((r) => Number(r.success ?? 0));
    const failure = rows.map((r) => Number(r.failure ?? 0));

    return {
      chart: {
        type: 'areaspline',
        backgroundColor: 'transparent',
        height: 300,
        spacingTop: 18,
        spacingLeft: 6,
        spacingRight: 8,
        spacingBottom: 2,
      },
      title: {
        text: 'Form Submission Events — Success vs Failure',
        align: 'left',
        margin: 10,
        style: {
          color: 'rgba(228, 247, 250, 0.95)',
          fontSize: '14px',
          fontWeight: '600',
        },
      },
      subtitle: {
        text: 'Last 7 days · area graph · toggleable Day / Week / Month',
        align: 'left',
        style: {
          color: 'rgba(173, 207, 215, 0.72)',
          fontSize: '11px',
          fontWeight: '400',
        },
      },
      credits: { enabled: false },
      xAxis: {
        categories,
        labels: { style: { color: 'rgba(212,237,242,0.56)', fontSize: '11px' } },
        lineColor: 'rgba(135, 178, 186, 0.24)',
        tickColor: 'rgba(135, 178, 186, 0.24)',
      },
      yAxis: {
        title: { text: undefined },
        labels: { style: { color: 'rgba(212,237,242,0.5)', fontSize: '11px' } },
        gridLineColor: 'rgba(98, 136, 143, 0.2)',
      },
      legend: {
        align: 'left',
        verticalAlign: 'top',
        y: 2,
        symbolRadius: 6,
        symbolWidth: 16,
        symbolHeight: 2,
        itemDistance: 14,
        itemStyle: { color: 'rgba(255,255,255,0.82)', fontSize: '13px' },
      },
      tooltip: {
        shared: true,
        backgroundColor: 'rgba(7, 22, 29, 0.96)',
        borderColor: 'rgba(0, 191, 178, 0.5)',
        style: { color: '#d9f6fb' },
      },
      plotOptions: {
        areaspline: {
          lineWidth: 2,
          fillOpacity: 0.2,
          marker: { enabled: false, radius: 0 },
        },
        series: {
          states: {
            hover: {
              enabled: true,
              lineWidthPlus: 0,
            },
          },
        },
      },
      series: [
        {
          type: 'areaspline',
          name: 'Success',
          data: success,
          color: '#17b39b',
          zIndex: 1,
          fillColor: {
            linearGradient: [0, 0, 0, 220],
            stops: [
              [0, 'rgba(23, 179, 155, 0.26)'],
              [1, 'rgba(23, 179, 155, 0.02)'],
            ],
          },
        },
        {
          type: 'areaspline',
          name: 'Failure',
          data: failure,
          color: '#f16995',
          lineWidth: 2.2,
          zIndex: 2,
          fillColor: {
            linearGradient: [0, 0, 0, 220],
            stops: [
              [0, 'rgba(241, 105, 149, 0.38)'],
              [1, 'rgba(241, 105, 149, 0.08)'],
            ],
          },
        },
      ],
    };
  });

  readonly trafficChartOptions = computed<Highcharts.Options>(() => {
    const rows = this.data()?.trafficTrend ?? [];
    const categories = rows.map((r) => this.toShortDate(r.date));
    const occurrences = rows.map((r) => Number(r.occurrences ?? 0));

    return {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        height: 300,
        spacingTop: 18,
        spacingLeft: 6,
        spacingRight: 8,
        spacingBottom: 2,
      },
      title: {
        text: 'Traffic Trend — Daily Page Visits',
        align: 'left',
        margin: 10,
        style: {
          color: 'rgba(228, 247, 250, 0.95)',
          fontSize: '14px',
          fontWeight: '600',
        },
      },
      subtitle: {
        text: 'Last 7 days · page visits by date',
        align: 'left',
        style: {
          color: 'rgba(173, 207, 215, 0.72)',
          fontSize: '11px',
          fontWeight: '400',
        },
      },
      credits: { enabled: false },
      xAxis: {
        categories,
        labels: { style: { color: 'rgba(212,237,242,0.56)', fontSize: '11px' } },
        lineColor: 'rgba(135, 178, 186, 0.24)',
        tickColor: 'rgba(135, 178, 186, 0.24)',
      },
      yAxis: {
        title: { text: undefined },
        labels: { style: { color: 'rgba(212,237,242,0.5)', fontSize: '11px' } },
        gridLineColor: 'rgba(98, 136, 143, 0.2)',
      },
      legend: {
        align: 'left',
        verticalAlign: 'top',
        y: 2,
        symbolRadius: 6,
        symbolWidth: 16,
        symbolHeight: 2,
        itemDistance: 14,
        itemStyle: { color: 'rgba(255,255,255,0.82)', fontSize: '13px' },
      },
      tooltip: {
        shared: true,
        backgroundColor: 'rgba(7, 22, 29, 0.96)',
        borderColor: 'rgba(0, 191, 178, 0.5)',
        style: { color: '#d9f6fb' },
      },
      plotOptions: {
        column: {
          borderWidth: 0,
          borderRadius: 3,
          pointPadding: 0.08,
          groupPadding: 0.06,
        },
      },
      series: [
        {
          type: 'column',
          name: 'Visits',
          data: occurrences,
          color: '#1fa8ae',
        },
      ],
    };
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const parsed = Number(params['serviceId']);
      const id = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      this.serviceId.set(id);
      if (!id) {
        this.errorMessage.set('Valid serviceId is required.');
        this.data.set(null);
        return;
      }
      this.load(id);
    });
  }

  goToServiceDetail(): void {
    const id = this.serviceId();
    const ministryId = this.data()?.ministryId;
    if (!id) return;
    this.router.navigate(['/service-detail'], {
      queryParams: {
        serviceId: id,
        ministryId: ministryId ?? '',
      },
    });
  }

  toPercent(value: string | number | null | undefined): number {
    if (value == null) return 0;
    if (typeof value === 'number') return this.clamp(value);
    const parsed = Number(String(value).replace('%', '').trim());
    return Number.isFinite(parsed) ? this.clamp(parsed) : 0;
  }

  metricToneByPercent(value: string | number | null | undefined): string {
    const score = this.toPercent(value);
    if (score >= 80) return 'metric-value--good';
    if (score >= 50) return 'metric-value--warn';
    return 'metric-value--bad';
  }

  private load(serviceId: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.apiService.getServiceAnalytics(serviceId).subscribe({
      next: (response: ApiResponse<ServiceAnalyticsData>) => {
        this.loading.set(false);
        if (!response?.isSuccessful || !response?.data) {
          this.data.set(null);
          this.errorMessage.set(response?.message ?? 'Failed to load service analytics.');
          return;
        }
        this.data.set(response.data);
      },
      error: () => {
        this.loading.set(false);
        this.data.set(null);
        this.errorMessage.set('Failed to load service analytics.');
      },
    });
  }

  private toShortDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  private clamp(v: number): number {
    return Math.max(0, Math.min(100, v));
  }
}

