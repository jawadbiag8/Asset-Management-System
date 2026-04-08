/**
 * DynamicReportComponent – core reports: category dropdown → sub-category tabs → data point tiles + chart.
 *
 * APIs (via ApiService, Bearer auth):
 * - GET /core-reports/categories
 * - GET /core-reports/sub-categories?categoryId=
 * - GET /core-reports/data-points/{subCategoryId}?ministryId=&departmentId=&asset=
 *
 * chartData shape per chartType (DataPoint.chartType):
 * - pie / donut / bar: [{ name: string, value: number }, ...]
 * - line / area: [{ name: string, series: [{ name: string, value: number }, ...] }, ...]
 */
import {
  Component,
  Input,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { of, catchError, map, tap, startWith } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService, ApiResponse } from '../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import * as Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import 'highcharts/modules/solid-gauge';
import { HighchartsChartDirective } from 'highcharts-angular';

/** Category row (dropdown). */
export interface Category {
  id: number;
  name: string;
}

/** Sub-category tab. */
export interface SubCategory {
  id: number;
  name: string;
}

interface MinistryOption {
  id: number;
  name: string;
}

interface DepartmentOption {
  id: number;
  name: string;
}

interface AssetOption {
  id: number;
  name: string;
}

/** Single data point tile + chart payload. */
export interface DataPoint {
  id: number | string;
  title: string;
  subtitle?: string;
  value: number | string;
  unit: string;
  changePercentage?: number;
  chartType: 'pie' | 'donut' | 'line' | 'bar' | 'area' | 'gauge';
  chartData?: unknown;
}

const DEFAULT_CHART_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#008080', '#6366F1'];

@Component({
  selector: 'app-dynamic-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    NgxMatSelectSearchModule,
    HighchartsChartDirective,
  ],
  templateUrl: './dynamic-report.component.html',
  styleUrls: ['./dynamic-report.component.scss'],
})
export class DynamicReportComponent implements OnInit, AfterViewInit {
  private readonly api = inject(ApiService);
  private readonly toastr = inject(ToastrService);
  readonly Highcharts = Highcharts;

  /** Optional filters for GET data-points (ministry / department / asset). */
  @Input() ministryId?: number | null;
  @Input() departmentId?: number | null;
  @Input() assetId?: number | string | null;

  @Input() chartColorScheme: string[] = DEFAULT_CHART_COLORS;

  /**
   * ngx-charts expects a Color object for `scheme`:
   * { name, selectable, group, domain }.
   * Passing a plain string[] can crash with "scaleType/getColor undefined".
   */
  get safeChartScheme(): any {
    const domain =
      Array.isArray(this.chartColorScheme) && this.chartColorScheme.length > 0
        ? this.chartColorScheme
        : DEFAULT_CHART_COLORS;

    return {
      name: 'reportScheme',
      selectable: true,
      group: 'Ordinal',
      domain,
    };
  }

  selectedCategory = signal<Category | null>(null);
  selectedSubCategory = signal<SubCategory | null>(null);
  categories = signal<Category[]>([]);
  /** Tabs for the selected category (from 2nd API). */
  subCategories = signal<SubCategory[]>([]);
  dataPoints = signal<DataPoint[]>([]);
  selectedDataPoint = signal<DataPoint | null>(null);

  categoriesLoading = signal(false);
  categoriesError = signal<string | null>(null);
  subCategoriesLoading = signal(false);
  subCategoriesError = signal<string | null>(null);
  dataPointsLoading = signal(false);
  dataPointsError = signal<string | null>(null);
  reportGenerating = signal(false);
  ministriesLoading = signal(false);
  ministriesError = signal<string | null>(null);
  departmentsLoading = signal(false);
  departmentsError = signal<string | null>(null);
  assetsLoading = signal(false);
  assetsError = signal<string | null>(null);

  ministries = signal<MinistryOption[]>([]);
  selectedMinistry = signal<MinistryOption | null>(null);
  departments = signal<DepartmentOption[]>([]);
  selectedDepartment = signal<DepartmentOption | null>(null);
  assets = signal<AssetOption[]>([]);
  selectedAsset = signal<AssetOption | null>(null);

  categoryFilterControl = new FormControl<string>('', { nonNullable: false });
  private categoryFilterTerm = toSignal(
    this.categoryFilterControl.valueChanges.pipe(startWith(this.categoryFilterControl.value ?? '')),
    { initialValue: this.categoryFilterControl.value ?? '' },
  );

  filteredCategories = computed(() => {
    const list = this.categories();
    const term = ((this.categoryFilterTerm() ?? '') as string).toLowerCase().trim();
    if (!term) return list;
    return list.filter((c) => c.name.toLowerCase().includes(term));
  });

  compareCategories = (a: Category | null, b: Category | null): boolean =>
    a?.id === b?.id && a?.name === b?.name;

  ministryFilterControl = new FormControl<string>('', { nonNullable: false });
  private ministryFilterTerm = toSignal(
    this.ministryFilterControl.valueChanges.pipe(startWith(this.ministryFilterControl.value ?? '')),
    { initialValue: this.ministryFilterControl.value ?? '' },
  );

  filteredMinistries = computed(() => {
    const list = this.ministries();
    const term = ((this.ministryFilterTerm() ?? '') as string).toLowerCase().trim();
    if (!term) return list;
    return list.filter((m) => m.name.toLowerCase().includes(term));
  });

  showMinistryDropdown = computed(() => {
    const categoryName = (this.selectedCategory()?.name ?? '').toLowerCase();
    return (
      categoryName.includes('ministry') ||
      categoryName.includes('department') ||
      categoryName.includes('asset')
    );
  });

  showDepartmentDropdown = computed(() => {
    const categoryName = (this.selectedCategory()?.name ?? '').toLowerCase();
    return categoryName.includes('department') || categoryName.includes('asset');
  });

  showAssetDropdown = computed(() => {
    const categoryName = (this.selectedCategory()?.name ?? '').toLowerCase();
    return categoryName.includes('asset');
  });

  compareMinistries = (a: MinistryOption | null, b: MinistryOption | null): boolean =>
    a?.id === b?.id && a?.name === b?.name;

  departmentFilterControl = new FormControl<string>('', { nonNullable: false });
  private departmentFilterTerm = toSignal(
    this.departmentFilterControl.valueChanges.pipe(startWith(this.departmentFilterControl.value ?? '')),
    { initialValue: this.departmentFilterControl.value ?? '' },
  );

  filteredDepartments = computed(() => {
    const list = this.departments();
    const term = ((this.departmentFilterTerm() ?? '') as string).toLowerCase().trim();
    if (!term) return list;
    return list.filter((d) => d.name.toLowerCase().includes(term));
  });

  compareDepartments = (a: DepartmentOption | null, b: DepartmentOption | null): boolean =>
    a?.id === b?.id && a?.name === b?.name;

  assetFilterControl = new FormControl<string>('', { nonNullable: false });
  private assetFilterTerm = toSignal(
    this.assetFilterControl.valueChanges.pipe(startWith(this.assetFilterControl.value ?? '')),
    { initialValue: this.assetFilterControl.value ?? '' },
  );

  filteredAssets = computed(() => {
    const list = this.assets();
    const term = ((this.assetFilterTerm() ?? '') as string).toLowerCase().trim();
    if (!term) return list;
    return list.filter((a) => a.name.toLowerCase().includes(term));
  });

  compareAssets = (a: AssetOption | null, b: AssetOption | null): boolean =>
    a?.id === b?.id && a?.name === b?.name;

  chartView: [number, number] = [400, 300];

  @ViewChild('chartContainer') chartContainerRef?: ElementRef<HTMLElement>;

  /** First column of tiles (ceil(n/2)); second column gets the rest — matches 3+2 layout for 5 items. */
  tilesFirstColumn = computed(() => {
    const pts = this.dataPoints();
    const mid = Math.ceil(pts.length / 2);
    return pts.slice(0, mid);
  });

  tilesSecondColumn = computed(() => {
    const pts = this.dataPoints();
    const mid = Math.ceil(pts.length / 2);
    return pts.slice(mid);
  });

  activeChartData = computed(() => {
    const dp = this.selectedDataPoint();
    if (!dp?.chartData) return null;
    const type = dp.chartType;
    const raw = dp.chartData as any;
    if (type === 'pie' || type === 'donut' || type === 'bar') {
      if (Array.isArray(raw) && raw.length > 0) return raw;
      if (raw?.results) return raw.results;
      return null;
    }
    if (type === 'line' || type === 'area') {
      if (Array.isArray(raw) && raw.length > 0) return raw;
      if (raw?.multi) return raw.multi;
      return null;
    }
    if (type === 'gauge') {
      if (raw?.value != null) {
        const numeric = Number(raw.value);
        if (!Number.isNaN(numeric)) {
          return [
            {
              name: String(dp.title ?? 'Value'),
              value: numeric,
              displayValue: raw.displayValue,
              unit: raw.unit,
            },
          ];
        }
      }
      if (Array.isArray(raw) && raw.length > 0) return raw;
      return null;
    }
    return null;
  });

  activeChartType = computed(() => this.selectedDataPoint()?.chartType ?? null);

  /** Recreate Highcharts when tile/type changes — fixes empty line/area after switching from pie/column/gauge. */
  chartInstanceKey = computed(() => {
    const dp = this.selectedDataPoint();
    const t = this.activeChartType();
    if (t === 'gauge') {
      const gaugeData = this.activeChartData() as any[] | null;
      const gaugeValue = Number(gaugeData?.[0]?.value ?? dp?.value ?? 0);
      return `${dp?.id ?? 'none'}::${t ?? 'none'}::${Number.isNaN(gaugeValue) ? 'nan' : gaugeValue}`;
    }
    return `${dp?.id ?? 'none'}::${t ?? 'none'}`;
  });

  gaugeValueText = computed(() => {
    const dp = this.selectedDataPoint();
    if (!dp || dp.chartType !== 'gauge') return '';
    const raw = this.activeChartData() as any[] | null;
    const chartVal = raw?.[0] as { displayValue?: string; value?: number } | undefined;
    if (chartVal?.displayValue != null && String(chartVal.displayValue).trim() !== '') {
      return String(chartVal.displayValue).trim();
    }
    const value = Number(chartVal?.value ?? dp.value ?? 0);
    if (Number.isNaN(value)) return this.formatMetricValue(dp);
    return `${value.toFixed(1)}%`;
  });

  highchartsOptions = computed<Highcharts.Options>(() => {
    const type = this.activeChartType();
    const data = this.activeChartData() as any;
    const dp = this.selectedDataPoint();
    const colors = this.chartColorDomain;

    const base: Highcharts.Options = {
      chart: {
        backgroundColor: 'transparent',
        spacing: [8, 8, 8, 8],
        style: { fontFamily: 'inherit' },
      },
      credits: { enabled: false },
      title: { text: undefined },
      colors,
    };

    if (!type || !data) return base;

    if (type === 'pie' || type === 'donut') {
      const pieData = (Array.isArray(data) ? data : []).map((d: any) => ({
        name: String(d?.name ?? ''),
        y: Number(d?.value ?? 0),
      }));
      return {
        ...base,
        chart: { ...base.chart, type: 'pie' },
        legend: {
          enabled: true,
          align: 'right',
          verticalAlign: 'middle',
          layout: 'vertical',
          itemStyle: { color: '#D7E4E2', fontSize: '11px' },
        },
        tooltip: { pointFormat: '<b>{point.y}</b>' },
        plotOptions: {
          pie: {
            allowPointSelect: false,
            dataLabels: { enabled: false },
            innerSize: type === 'donut' ? '58%' : '0%',
            borderWidth: 0,
            showInLegend: true,
          },
        },
        series: [
          {
            type: 'pie',
            name: dp?.title ?? 'Series',
            data: pieData,
          },
        ],
      };
    }

    if (type === 'bar') {
      const rows = Array.isArray(data) ? data : [];
      return {
        ...base,
        chart: { ...base.chart, type: 'column' },
        xAxis: {
          categories: rows.map((d: any) => String(d?.name ?? '')),
          labels: { style: { color: '#BFD4D1', fontSize: '10px' } },
        },
        yAxis: {
          title: { text: undefined },
          labels: { style: { color: '#BFD4D1' } },
          gridLineColor: 'rgba(255,255,255,0.08)',
        },
        legend: { enabled: false },
        tooltip: { pointFormat: '<b>{point.y}</b>' },
        series: [
          {
            type: 'column',
            name: dp?.title ?? 'Value',
            data: rows.map((d: any) => Number(d?.value ?? 0)),
          },
        ],
      };
    }

    if (type === 'line' || type === 'area') {
      const multi = Array.isArray(data) ? data : [];
      const curveType: 'spline' | 'areaspline' = type === 'area' ? 'areaspline' : 'spline';
      const pointMarker = {
        enabled: true,
        radius: 4,
        lineWidth: 1,
        lineColor: '#E8F4F2',
      };
      return {
        ...base,
        chart: { ...base.chart, type: curveType },
        xAxis: {
          categories: (multi[0]?.series ?? []).map((p: any) => String(p?.name ?? '')),
          labels: { style: { color: '#BFD4D1', fontSize: '10px' } },
          lineColor: 'rgba(255,255,255,0.12)',
          gridLineWidth: 1,
          gridLineColor: 'rgba(255,255,255,0.06)',
        },
        yAxis: {
          title: { text: undefined },
          labels: { style: { color: '#BFD4D1' } },
          gridLineColor: 'rgba(255,255,255,0.08)',
        },
        legend: {
          enabled: true,
          align: 'center',
          verticalAlign: 'bottom',
          itemStyle: { color: '#D7E4E2', fontSize: '11px' },
        },
        tooltip: { shared: true },
        plotOptions: {
          spline: { lineWidth: 2.5, marker: pointMarker },
          areaspline: { lineWidth: 2.5, fillOpacity: 0.22, marker: pointMarker },
        },
        series: multi.map((s: any) => ({
          type: curveType,
          name: String(s?.name ?? 'Series'),
          data: (s?.series ?? []).map((p: any) => Number(p?.value ?? p?.y ?? 0)),
        })),
      };
    }

    if (type === 'gauge') {
      const raw = data?.[0];
      const value = Number(raw?.value ?? 0);
      // Exact percentage on arc (0–100). e.g. 0.4 → only 0.4% of the semicircle is green.
      const clamped = Math.max(0, Math.min(100, value));
      // Keep a tiny visible arc for very small non-zero values when no track is shown.
      const visibleGaugeValue = clamped > 0 ? Math.max(clamped, 1.2) : 0;
      return {
        ...base,
        chart: { ...base.chart, type: 'solidgauge' },
        tooltip: { enabled: false },
        title: { text: undefined },
        pane: {
          center: ['50%', '82%'],
          size: '132%',
          startAngle: -90,
          endAngle: 90,
          // Full track (remainder); series draws value on top from arc start — matches real %.
          background: [
            {
              outerRadius: '100%',
              innerRadius: '66%',
              backgroundColor: 'transparent',
              borderWidth: 0,
            },
          ],
        },
        yAxis: {
          min: 0,
          max: 100,
          lineWidth: 0,
          tickPositions: [],
          minorTickInterval: undefined,
        },
        plotOptions: {
          solidgauge: {
            dataLabels: { enabled: false },
            rounded: true,
            linecap: 'round',
            borderWidth: 0,
          },
        },
        series: [
          {
            type: 'solidgauge',
            name: 'Value',
            color: '#68be32',
            data: [visibleGaugeValue],
            innerRadius: '66%',
            radius: '100%',
          },
        ],
      };
    }

    return base;
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  ngAfterViewInit(): void {
    this.updateChartView();
  }

  loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(null);
    this.api
      .getCoreReportCategories()
      .pipe(
        map((res: ApiResponse) => {
          if (res?.isSuccessful === false) {
            throw new Error(res.message ?? 'Failed to load categories');
          }
          const raw = res?.data;
          const list = Array.isArray(raw) ? raw : [];
          return list.map((c: any) => ({
            id: Number(c.id),
            name: String(c.name ?? ''),
          })) as Category[];
        }),
        tap((normalized) => {
          this.categories.set(normalized);
          this.categoriesLoading.set(false);
          if (normalized.length > 0) {
            const first = normalized[0];
            this.selectedCategory.set(first);
            this.handleCategoryDependentFilters(first);
            this.loadSubCategories(first.id);
          }
        }),
        catchError((err: Error) => {
          this.categoriesLoading.set(false);
          this.categoriesError.set(err?.message ?? 'Failed to load categories');
          return of([]);
        }),
      )
      .subscribe();
  }

  loadSubCategories(categoryId: number): void {
    this.subCategoriesLoading.set(true);
    this.subCategoriesError.set(null);
    this.subCategories.set([]);
    this.selectedSubCategory.set(null);
    this.dataPoints.set([]);
    this.selectedDataPoint.set(null);

    const filters = this.getSubCategoryFilters();
    this.api
      .getCoreReportSubCategories(categoryId, filters)
      .pipe(
        map((res: ApiResponse) => {
          if (res?.isSuccessful === false) {
            throw new Error(res.message ?? 'Failed to load sub-categories');
          }
          const raw = res?.data;
          const list = Array.isArray(raw) ? raw : [];
          return list.map((s: any) => ({
            id: Number(s.id),
            name: String(s.name ?? ''),
          })) as SubCategory[];
        }),
        tap((subs) => {
          this.subCategories.set(subs);
          this.subCategoriesLoading.set(false);
          if (subs.length > 0) {
            const first = subs[0];
            this.selectedSubCategory.set(first);
            this.loadDataPointsForSubCategory(first.id);
          }
        }),
        catchError((err: Error) => {
          this.subCategoriesLoading.set(false);
          this.subCategoriesError.set(err?.message ?? 'Failed to load sub-categories');
          return of([]);
        }),
      )
      .subscribe();
  }

  loadDataPointsForSubCategory(subCategoryId: number): void {
    this.dataPointsLoading.set(true);
    this.dataPointsError.set(null);
    const filters = this.getReportFilters();

    this.api
      .getCoreReportDataPoints(subCategoryId, filters)
      .pipe(
        map((res: ApiResponse<unknown>) => {
          if (res?.isSuccessful === false) {
            throw new Error(res.message ?? 'Failed to load data points');
          }
          const rows = this.extractDataPointsArray(res);
          return rows.map((row) => this.mapCoreReportDataPoint(row));
        }),
        tap((points: DataPoint[]) => {
          this.dataPoints.set(points);
          this.selectedDataPoint.set(points[0] ?? null);
          this.dataPointsLoading.set(false);
        }),
        catchError((err: Error) => {
          this.dataPointsLoading.set(false);
          this.dataPointsError.set(err?.message ?? 'Failed to load report data');
          return of([]);
        }),
      )
      .subscribe();
  }

  private getReportFilters():
    | { ministryId?: number; departmentId?: number; assetId?: number | string }
    | undefined {
    const f: { ministryId?: number; departmentId?: number; assetId?: number | string } = {};
    const selectedMinistryId = this.selectedMinistry()?.id;
    if (selectedMinistryId != null) {
      f.ministryId = selectedMinistryId;
    } else if (this.ministryId != null) {
      f.ministryId = this.ministryId;
    }
    const selectedDepartmentId = this.selectedDepartment()?.id;
    if (selectedDepartmentId != null) {
      f.departmentId = selectedDepartmentId;
    } else if (this.departmentId != null) {
      f.departmentId = this.departmentId;
    }
    const selectedAssetId = this.selectedAsset()?.id;
    if (selectedAssetId != null) {
      f.assetId = selectedAssetId;
    } else if (this.assetId != null && this.assetId !== '') {
      f.assetId = this.assetId;
    }
    return Object.keys(f).length ? f : undefined;
  }

  private getSubCategoryFilters():
    | { ministryId?: number; departmentId?: number; assetId?: number | string }
    | undefined {
    const f: { ministryId?: number; departmentId?: number; assetId?: number | string } = {};
    const selectedMinistryId = this.selectedMinistry()?.id;
    if (selectedMinistryId != null) {
      f.ministryId = selectedMinistryId;
    } else if (this.ministryId != null) {
      f.ministryId = this.ministryId;
    }
    const selectedDepartmentId = this.selectedDepartment()?.id;
    if (selectedDepartmentId != null) {
      f.departmentId = selectedDepartmentId;
    } else if (this.departmentId != null) {
      f.departmentId = this.departmentId;
    }
    const selectedAssetId = this.selectedAsset()?.id;
    if (selectedAssetId != null) {
      f.assetId = selectedAssetId;
    } else if (this.assetId != null && this.assetId !== '') {
      f.assetId = this.assetId;
    }
    return Object.keys(f).length ? f : undefined;
  }

  private handleCategoryDependentFilters(category: Category): void {
    const lower = category.name.toLowerCase();
    const isMinistryOrDepartmentContext =
      lower.includes('ministry') || lower.includes('department') || lower.includes('asset');
    const isDepartmentContext = lower.includes('department');
    const isAssetContext = lower.includes('asset');
    if (!isMinistryOrDepartmentContext) {
      this.selectedMinistry.set(null);
      this.selectedDepartment.set(null);
      this.selectedAsset.set(null);
      this.departments.set([]);
      this.assets.set([]);
      this.ministryFilterControl.setValue('', { emitEvent: false });
      this.departmentFilterControl.setValue('', { emitEvent: false });
      this.assetFilterControl.setValue('', { emitEvent: false });
      return;
    }
    if (!isDepartmentContext && !isAssetContext) {
      this.selectedDepartment.set(null);
      this.departments.set([]);
      this.departmentFilterControl.setValue('', { emitEvent: false });
    }
    if (!isAssetContext) {
      this.selectedAsset.set(null);
      this.assets.set([]);
      this.assetFilterControl.setValue('', { emitEvent: false });
    }
    this.loadMinistries();
  }

  private loadMinistries(): void {
    if (this.ministriesLoading()) return;
    this.ministriesLoading.set(true);
    this.ministriesError.set(null);
    this.api
      .getAllMinistries()
      .pipe(
        map((res: ApiResponse) => {
          if (res?.isSuccessful === false) {
            throw new Error(res.message ?? 'Failed to load ministries');
          }
          const raw = Array.isArray(res?.data) ? res.data : [];
          return raw
            .map((m: any) => ({
              id: Number(m.id ?? m.ministryId),
              name: String(m.ministryName ?? m.name ?? ''),
            }))
            .filter((m: MinistryOption) => Number.isFinite(m.id) && m.name.trim() !== '');
        }),
        tap((items: MinistryOption[]) => {
          this.ministries.set(items);
          this.ministriesLoading.set(false);
          if (items.length === 0) {
            this.selectedMinistry.set(null);
            return;
          }
          const current = this.selectedMinistry();
          const exists = current ? items.some((m) => m.id === current.id) : false;
          if (!exists) {
            this.selectedMinistry.set(items[0]);
          }
        }),
        catchError((err: Error) => {
          this.ministriesLoading.set(false);
          this.ministriesError.set(err?.message ?? 'Failed to load ministries');
          this.ministries.set([]);
          this.selectedMinistry.set(null);
          return of([]);
        }),
      )
      .subscribe(() => {
        if (this.showDepartmentDropdown()) {
          const ministryId = this.selectedMinistry()?.id;
          if (ministryId != null) {
            this.loadDepartmentsByMinistry(ministryId);
            return;
          }
        }
        const category = this.selectedCategory();
        if (category) {
          this.loadSubCategories(category.id);
        }
      });
  }

  private loadDepartmentsByMinistry(ministryId: number): void {
    this.departmentsLoading.set(true);
    this.departmentsError.set(null);
    this.departments.set([]);
    this.selectedDepartment.set(null);
    this.api
      .getDepartmentsByMinistry(ministryId)
      .pipe(
        map((res: ApiResponse) => {
          if (res?.isSuccessful === false) {
            throw new Error(res.message ?? 'Failed to load departments');
          }
          const raw = Array.isArray(res?.data) ? res.data : [];
          return raw
            .map((d: any) => ({
              id: Number(d.id ?? d.departmentId),
              name: String(d.departmentName ?? d.name ?? ''),
            }))
            .filter((d: DepartmentOption) => Number.isFinite(d.id) && d.name.trim() !== '');
        }),
        tap((items: DepartmentOption[]) => {
          this.departments.set(items);
          this.departmentsLoading.set(false);
          if (this.showAssetDropdown()) {
            // Asset-level reports allow direct ministry assets without a department.
            this.selectedDepartment.set(null);
          } else if (items.length > 0) {
            this.selectedDepartment.set(items[0]);
          } else {
            this.selectedDepartment.set(null);
          }
        }),
        catchError((err: Error) => {
          this.departmentsLoading.set(false);
          this.departmentsError.set(err?.message ?? 'Failed to load departments');
          this.departments.set([]);
          this.selectedDepartment.set(null);
          return of([]);
        }),
      )
      .subscribe(() => {
        if (this.showAssetDropdown()) {
          const selectedMinistryId = this.selectedMinistry()?.id;
          if (selectedMinistryId != null) {
            this.loadAssetsByMinistry(selectedMinistryId, this.selectedDepartment()?.id ?? null);
          } else {
            this.assets.set([]);
            this.selectedAsset.set(null);
            const category = this.selectedCategory();
            if (category) {
              this.loadSubCategories(category.id);
            }
          }
          return;
        }
        const category = this.selectedCategory();
        if (category) {
          this.loadSubCategories(category.id);
        }
      });
  }

  private loadAssetsByMinistry(ministryId: number, departmentId: number | null): void {
    this.assetsLoading.set(true);
    this.assetsError.set(null);
    this.assets.set([]);
    this.selectedAsset.set(null);
    let params = new HttpParams();
    if (departmentId != null) {
      params = params.set('departmentId', String(departmentId));
    }
    this.api
      .getAssestByMinistry(params, ministryId)
      .pipe(
        map((res: ApiResponse<any>) => {
          if (res?.isSuccessful === false) {
            throw new Error(res.message ?? 'Failed to load assets');
          }
          const payload = res?.data as any;
          const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];
          return rows
            .map((a: any) => ({
              id: Number(a.id ?? a.assetId),
              name: String(a.assetName ?? a.name ?? a.websiteApplication ?? ''),
            }))
            .filter((a: AssetOption) => Number.isFinite(a.id) && a.name.trim() !== '');
        }),
        tap((items: AssetOption[]) => {
          this.assets.set(items);
          this.assetsLoading.set(false);
          // Default select first asset.
          this.selectedAsset.set(items[0] ?? null);
        }),
        catchError((err: Error) => {
          this.assetsLoading.set(false);
          this.assetsError.set(err?.message ?? 'Failed to load assets');
          this.assets.set([]);
          this.selectedAsset.set(null);
          return of([]);
        }),
      )
      .subscribe(() => {
        const category = this.selectedCategory();
        if (category) {
          this.loadSubCategories(category.id);
        }
      });
  }

  /** Normalize various API shapes to a flat array of data point objects. */
  private extractDataPointsArray(res: ApiResponse<unknown> | any): any[] {
    const data = res?.data as any;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.dataPoints)) return data.dataPoints;
    if (data && Array.isArray(data.points)) return data.points;
    if (Array.isArray(res?.dataPoints)) return res.dataPoints;
    if (Array.isArray(res?.data?.dataPoints)) return res.data.dataPoints;
    return [];
  }

  private mapCoreReportDataPoint(raw: any): DataPoint {
    const title = raw.title ?? raw.name ?? raw.label ?? 'Metric';
    const subtitle = raw.subtitle ?? raw.description ?? undefined;

    let chartType = this.normalizeChartType(
      raw.type ?? raw.chartType ?? raw.chartTypeName ?? raw.visualizationType,
    );

    // Backend can sometimes send ambiguous chartType values.
    // If chartValue is scalar ({ value, unit }) and not labels/data, treat it as gauge —
    // but never when this row is clearly line/area or has multi-series chartData (KPI value + graph).
    const cv = raw.chartValue ?? raw.chart_value ?? raw.chart;
    const cd = raw.chartData ?? raw.data;
    const hasLineAreaPayload =
      chartType === 'line' ||
      chartType === 'area' ||
      (!!cd?.multi && Array.isArray(cd.multi)) ||
      (Array.isArray(cd) && cd.length > 0 && Array.isArray((cd[0] as any)?.series)) ||
      (!!cv?.labels &&
        Array.isArray(cv.labels) &&
        Array.isArray(cv?.series) &&
        cv.series.length > 0 &&
        Array.isArray(cv.series[0]?.data));
    if (
      cv &&
      cv.value != null &&
      !Array.isArray(cv.labels) &&
      !Array.isArray(cv.data) &&
      !hasLineAreaPayload
    ) {
      chartType = 'gauge';
    }

    // If backend already provides normalized payload (results/multi), prefer it.
    let chartData: unknown = this.extractChartDataFromRaw(raw, chartType);

    // Used for:
    // 1) rebuilding ngx-charts payload when backend doesn't provide chartData
    // 2) fallback metric value computation when backend doesn't provide a numeric value
    const seriesLike =
      raw.series ??
      raw.chartSeries ??
      raw.segments ??
      raw.items ??
      raw.values ??
      raw.seriesData;

    if (!chartData) {
      // Otherwise rebuild chart payload from series-like structures.
      chartData = this.buildChartDataFromSeries(seriesLike, chartType, raw);
      if (!chartData && (chartType === 'line' || chartType === 'area')) {
        chartData = this.buildLineAreaFallback(raw);
      }
    }

    // Tiles in your backend use `defaultValue` and sometimes `chartValue`.
    let value: number | string =
      raw.value ??
      raw.metricValue ??
      raw.total ??
      raw.kpiValue ??
      raw.defaultValue ??
      raw.chartValue?.displayValue ??
      raw.chartValue?.value ??
      '—';

    let unit = raw.unit ?? raw.valueSuffix ?? raw.chartValue?.unit ?? '';

    // Prefer numeric gauge value if backend provides it.
    if (raw.chartValue?.value != null) {
      const maybeNum = Number(raw.chartValue.value);
      if (!Number.isNaN(maybeNum)) value = maybeNum;
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '' && !trimmed.includes('%')) {
        const maybeNum = Number(trimmed);
        if (!Number.isNaN(maybeNum)) value = maybeNum;
      }
    }

    // If value is still missing, compute a sum from series-like structures.
    if (
      (value === '—' || value === null || value === undefined) &&
      Array.isArray(seriesLike) &&
      chartType !== 'line' &&
      chartType !== 'area'
    ) {
      const nums = seriesLike.map((s: any) => Number(s?.value ?? s?.count ?? s?.y ?? 0));
      if (nums.some((n: number) => !Number.isNaN(n))) {
        value = nums.reduce((a: number, b: number) => a + b, 0);
      }
    }
    const id = raw.id ?? `${title}-${subtitle ?? ''}`;

    return {
      id,
      title,
      subtitle,
      value,
      unit,
      chartType,
      chartData,
    };
  }

  /**
   * Extract chartData in ngx-charts-friendly shape when backend already provides it.
   * Supports:
   * - pie/bar: raw.chartData.results = [{name,value}]
   * - line/area: raw.chartData.multi = [{name, series:[{name,value}]}]
   * - line/area: raw.chartValue = { labels: [...], series: [{ name, data: number[] }] }
   * - also tolerates raw.chartData directly as an array.
   */
  private extractChartDataFromRaw(raw: any, chartType: DataPoint['chartType']): unknown {
    const cd = raw.chartData ?? raw.data ?? raw.payload;
    const cv = raw.chartValue ?? raw.chart_value ?? raw.chart;
    if (!cd && !cv) return null;

    // Line/area: chartValue { labels: string[], series: [{ name, data: number[] }] } (aligned by index).
    if (
      (chartType === 'line' || chartType === 'area') &&
      cv.labels &&
      Array.isArray(cv.labels) &&
      Array.isArray(cv.series) &&
      cv.series.length > 0 &&
      Array.isArray(cv.series[0]?.data)
    ) {
      const labels = cv.labels.map((l: any) => String(l ?? ''));
      return cv.series.map((s: any) => {
        const arr = Array.isArray(s?.data) ? s.data : [];
        return {
          name: String(s?.name ?? 'Series'),
          series: labels.map((label: string, i: number) => ({
            name: label,
            value: Number(arr[i] ?? 0),
          })),
        };
      });
    }

    // Line/area (single series): chartValue { labels: [...], data: [...] }.
    // Backend uses this shape for cases like "Total Incidents Trend by Ministry".
    if (
      (chartType === 'line' || chartType === 'area') &&
      cv?.labels &&
      cv?.data &&
      Array.isArray(cv.labels) &&
      Array.isArray(cv.data)
    ) {
      const labels = cv.labels.map((l: any) => String(l ?? ''));
      return [
        {
          name: String(raw.title ?? raw.name ?? raw.description ?? 'Series'),
          series: labels.map((label: string, i: number) => ({
            name: label,
            value: Number(cv.data[i] ?? 0),
          })),
        },
      ];
    }

    // Your backend response uses:
    // chartValue: { labels: [...], data: [...] } for pie/bar/donut.
    if (
      cv?.labels &&
      cv?.data &&
      Array.isArray(cv.labels) &&
      Array.isArray(cv.data) &&
      (chartType === 'pie' || chartType === 'donut' || chartType === 'bar')
    ) {
      return cv.labels.map((label: any, i: number) => ({
        name: String(label ?? ''),
        value: Number(cv.data[i] ?? 0),
      }));
    }

    // Gauge payload from backend: { value, displayValue, unit }.
    if (chartType === 'gauge' && cv?.value != null) {
      const numeric = Number(cv.value);
      if (!Number.isNaN(numeric)) {
        return {
          value: numeric,
          displayValue: cv.displayValue,
          unit: cv.unit,
          min: cv.min ?? 0,
          max: cv.max ?? 100,
        };
      }
    }

    // Common nested wrappers (normalized payloads).
    if (
      cd?.results &&
      (chartType === 'pie' || chartType === 'donut' || chartType === 'bar')
    ) {
      if (Array.isArray(cd.results)) {
        return cd.results.map((x: any) => ({
          name: String(x.name ?? x.label ?? x.key ?? ''),
          value: Number(x.value ?? x.count ?? x.y ?? 0),
        }));
      }
    }

    if (cd?.multi && (chartType === 'line' || chartType === 'area')) {
      if (Array.isArray(cd.multi)) {
        return cd.multi.map((s: any) => ({
          name: String(s.name ?? ''),
          series: Array.isArray(s.series)
            ? s.series.map((p: any) => ({
                name: String(p.name ?? p.label ?? p.x ?? ''),
                value: Number(p.value ?? p.y ?? 0),
              }))
            : [],
        }));
      }
    }

    // If raw.chartData is already an array in the expected shape, keep it but normalize.
    if (Array.isArray(cd) && (chartType === 'pie' || chartType === 'donut' || chartType === 'bar')) {
      return cd.map((x: any) => ({
        name: String(x.name ?? x.label ?? x.key ?? x.category ?? ''),
        value: Number(x.value ?? x.count ?? x.y ?? 0),
      }));
    }

    if (Array.isArray(cd) && (chartType === 'line' || chartType === 'area')) {
      // Either already multi-series or list of points.
      if (cd.length > 0 && cd[0]?.series && Array.isArray(cd[0].series)) {
        return cd.map((s: any) => ({
          name: String(s.name ?? ''),
          series: Array.isArray(s.series)
            ? s.series.map((p: any) => ({
                name: String(p.name ?? p.label ?? p.x ?? ''),
                value: Number(p.value ?? p.y ?? 0),
              }))
            : [],
        }));
      }
      // Fallback: treat as single series of points.
      return [
        {
          name: raw.title ?? raw.name ?? 'Series',
          series: cd.map((p: any) => ({
            name: String(p.name ?? p.x ?? ''),
            value: Number(p.value ?? p.y ?? 0),
          })),
        },
      ];
    }

    return null;
  }

  private buildChartDataFromSeries(
    series: any,
    chartType: DataPoint['chartType'],
    raw: any,
  ): unknown {
    if (!Array.isArray(series) || series.length === 0) return null;

    if (chartType === 'pie' || chartType === 'donut' || chartType === 'bar') {
      return series.map((item: any, i: number) => ({
        name: String(item.name ?? item.label ?? item.key ?? item.category ?? `Item ${i + 1}`),
        value: Number(item.value ?? item.count ?? item.y ?? 0),
      }));
    }

    if (chartType === 'line' || chartType === 'area') {
      if (series[0]?.series && Array.isArray(series[0].series)) {
        return series.map((s: any) => ({
          name: String(s.name ?? 'Series'),
          series: (s.series ?? []).map((p: any) => ({
            name: String(p.name ?? p.label ?? p.x ?? ''),
            value: Number(p.value ?? p.y ?? 0),
          })),
        }));
      }
      const lineSeries = series.map((p: any) => ({
        name: String(p.name ?? p.label ?? p.x ?? p.category ?? ''),
        value: Number(p.value ?? p.y ?? 0),
      }));
      return [{ name: String(raw.title ?? raw.name ?? 'Series'), series: lineSeries }];
    }

    return null;
  }

  private buildLineAreaFallback(raw: any): unknown {
    const multi = raw.multi ?? raw.multiSeries;
    if (Array.isArray(multi)) return multi;
    return null;
  }

  private normalizeChartType(api: string | undefined): DataPoint['chartType'] {
    const t = (api || '').toString().trim().toUpperCase().replace(/[\s-]/g, '_');
    if (t.includes('GAUGE')) return 'gauge';
    if (t.includes('DONUT') || t === 'DOUGHNUT') return 'donut';
    if (t.includes('PIE')) return 'pie';
    if (t.includes('BAR') || t.includes('COLUMN') || t === 'HORIZONTAL_BAR') return 'bar';
    if (t.includes('LINE')) return 'line';
    if (t.includes('AREA')) return 'area';
    if (t === 'KPI_CARD' || t === 'KPI') return 'donut';
    return 'donut';
  }

  onCategoryChange(category: Category | null): void {
    this.selectedCategory.set(category ?? null);
    if (category) {
      this.handleCategoryDependentFilters(category);
      this.loadSubCategories(category.id);
    } else {
      this.subCategories.set([]);
      this.selectedSubCategory.set(null);
      this.dataPoints.set([]);
      this.selectedDataPoint.set(null);
      this.selectedMinistry.set(null);
      this.selectedDepartment.set(null);
      this.selectedAsset.set(null);
      this.departments.set([]);
      this.assets.set([]);
    }
  }

  onMinistryChange(ministry: MinistryOption | null): void {
    this.selectedMinistry.set(ministry ?? null);
    const category = this.selectedCategory();
    if (!category) return;
    if (this.showDepartmentDropdown()) {
      const ministryId = this.selectedMinistry()?.id;
      if (ministryId != null) {
        this.loadDepartmentsByMinistry(ministryId);
      } else {
        this.selectedDepartment.set(null);
        this.departments.set([]);
        this.selectedAsset.set(null);
        this.assets.set([]);
        this.loadSubCategories(category.id);
      }
      return;
    }
    if (category) {
      this.loadSubCategories(category.id);
    }
  }

  onDepartmentChange(department: DepartmentOption | null): void {
    this.selectedDepartment.set(department ?? null);
    const category = this.selectedCategory();
    if (this.showAssetDropdown()) {
      const ministryId = this.selectedMinistry()?.id;
      if (ministryId != null) {
        this.loadAssetsByMinistry(ministryId, this.selectedDepartment()?.id ?? null);
      } else if (category) {
        this.assets.set([]);
        this.selectedAsset.set(null);
        this.loadSubCategories(category.id);
      }
      return;
    }
    if (category) {
      this.loadSubCategories(category.id);
    }
  }

  onAssetChange(asset: AssetOption | null): void {
    this.selectedAsset.set(asset ?? null);
    const category = this.selectedCategory();
    if (category) {
      this.loadSubCategories(category.id);
    }
  }

  onSubCategoryClick(sub: SubCategory): void {
    this.selectedSubCategory.set(sub);
    this.loadDataPointsForSubCategory(sub.id);
  }

  onDataPointClick(dp: DataPoint): void {
    this.selectedDataPoint.set(dp);
    setTimeout(() => this.updateChartView(), 0);
  }

  onGenerateReport(): void {
    const categoryId = this.selectedCategory()?.id;
    if (!categoryId) {
      this.toastr.warning('Please select a report category first.', 'Generate Report');
      return;
    }
    const filters = this.getGenerateReportFilters();
    const reportTab = window.open('', '_blank');
    this.reportGenerating.set(true);
    this.api.getCoreReportCategoryPdf(categoryId, filters).subscribe({
      next: (blob) => {
        this.reportGenerating.set(false);
        if (!blob || blob.size === 0) {
          reportTab?.close();
          this.toastr.error('Report file is empty.', 'Generate Report');
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        if (reportTab) {
          reportTab.location.href = objectUrl;
        } else {
          // Fallback if browser blocks opening a new tab.
          window.location.assign(objectUrl);
        }
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: (err) => {
        this.reportGenerating.set(false);
        reportTab?.close();
        const message = err?.error?.message || err?.message || 'Failed to generate report.';
        this.toastr.error(message, 'Generate Report');
      },
    });
  }

  isSubCategoryActive(sub: SubCategory): boolean {
    return this.selectedSubCategory()?.id === sub.id;
  }

  isDataPointActive(dp: DataPoint): boolean {
    return this.selectedDataPoint()?.id === dp.id;
  }

  /** Refresh current report (same filters). */
  refreshReport(): void {
    const sub = this.selectedSubCategory();
    if (sub) {
      this.loadDataPointsForSubCategory(sub.id);
    }
  }

  private getGenerateReportFilters():
    | { ministryId?: number; departmentId?: number; assetId?: number | string }
    | undefined {
    const f: { ministryId?: number; departmentId?: number; assetId?: number | string } = {};
    if (this.showMinistryDropdown()) {
      const ministryId = this.selectedMinistry()?.id;
      if (ministryId != null) {
        f.ministryId = ministryId;
      }
    }
    if (this.showDepartmentDropdown()) {
      const departmentId = this.selectedDepartment()?.id;
      if (departmentId != null) {
        f.departmentId = departmentId;
      }
    }
    if (this.showAssetDropdown()) {
      const assetId = this.selectedAsset()?.id;
      if (assetId != null) {
        f.assetId = assetId;
      }
    }
    return Object.keys(f).length > 0 ? f : undefined;
  }

  formatMetricValue(dp: DataPoint): string {
    const v = dp.value;
    if (typeof v === 'number' && !Number.isNaN(v)) {
      return v.toLocaleString();
    }
    return String(v ?? '—');
  }

  changeClass(changePercentage: number): string {
    if (changePercentage > 0) return 'change-positive';
    if (changePercentage < 0) return 'change-negative';
    return 'change-neutral';
  }

  formatChange(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  }

  get donutChartView(): [number, number] {
    const width = Math.max(300, Math.min(460, this.chartView[0] - 210));
    const height = Math.max(240, Math.min(360, this.chartView[1] + 12));
    return [width, height];
  }

  get chartColorDomain(): string[] {
    const maybe = this.safeChartScheme?.domain;
    return Array.isArray(maybe) && maybe.length > 0 ? maybe : DEFAULT_CHART_COLORS;
  }

  private updateChartView(): void {
    if (this.chartContainerRef?.nativeElement) {
      const w = this.chartContainerRef.nativeElement.offsetWidth || 400;
      const h = Math.min(320, Math.max(280, w * 0.6));
      this.chartView = [w, h];
    }
  }
}
