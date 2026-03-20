/**
 * DynamicReportComponent – dynamic report dashboard with category dropdown,
 * subcategory pills, data point tiles, and ngx-charts-driven chart.
 *
 * API adjustments:
 * - categoryApiUrl: GET; response can be Category[] or { data: Category[] }. We use res?.data ?? res.
 * - subCategoryDataApiUrl: GET with ?subCategoryId=xxx; response { dataPoints: DataPoint[] } or { data: { dataPoints } }. We use res?.dataPoints ?? res.
 *
 * chartData per chartType (DataPoint.chartData):
 * - pie / donut: [{ name: string, value: number }, ...]
 * - bar: same as pie
 * - line / area: multi-series: [{ name: string, series: [{ name: string, value: number }, ...] }, ...]
 */
import {
  Component,
  Input,
  signal,
  computed,
  effect,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { of, catchError, map, tap, startWith } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

// ─── API & Data Interfaces ───────────────────────────────────────────────────
/** Category from categoryApiUrl response (normalized for the component). */
export interface Category {
  id: number;
  name: string;
  subCategories: SubCategory[];
}

/** SubCategory under a Category. */
export interface SubCategory {
  id: number;
  name: string;
  subCategoryId: string | number;
}

/** Raw category shape from `/api/report-definitions/categories`. */
interface CategoryApiResponse {
  id: number;
  name: string;
  description?: string | null;
  orderIndex?: number;
  subCategories?: SubCategoryApiResponse[];
}

/** Raw subcategory shape from `/api/report-definitions/categories`. */
interface SubCategoryApiResponse {
  id: number;
  name: string;
  description?: string | null;
  orderIndex?: number;
  /** Backend may optionally send precomputed dataPoints; we ignore here. */
  dataPoints?: unknown[];
}

/** Single data point tile (from subCategoryDataApiUrl → dataPoints[]). */
export interface DataPoint {
  id: number | string;
  title: string;
  /** Optional subtitle below title (e.g. "Websites, Web apps, Mobile apps"). */
  subtitle?: string;
  value: number | string;
  unit: string;
  changePercentage?: number;
  /** Chart to show when this tile is selected: pie | donut | line | bar | area */
  chartType: 'pie' | 'donut' | 'line' | 'bar' | 'area';
  /**
   * Chart payload per chartType:
   * - pie / donut: [{ name: string, value: number }, ...]
   * - line / area: { name: string, series: [{ name: string, value: number }, ...] }[] or single series
   * - bar: [{ name: string, value: number }, ...]
   */
  chartData?: unknown;
}

/** API B response: { dataPoints: DataPoint[] } */
export interface SubCategoryDataResponse {
  dataPoints: DataPoint[];
}

/** Raw datapoint from GET /report-definitions/subcategories/:id/datapoints */
export interface ReportDefinitionDataPointApi {
  id: number;
  name: string;
  description?: string | null;
  chartType: string; // e.g. "KPI_CARD", "BAR", "PIE"
  orderIndex?: number;
}

// ─── Default color scheme for ngx-charts (matches screenshot: green, yellow, red, etc.) ───
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
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgxMatSelectSearchModule,
    NgxChartsModule,
  ],
  templateUrl: './dynamic-report.component.html',
  styleUrls: ['./dynamic-report.component.scss'],
})
export class DynamicReportComponent implements OnInit, AfterViewInit {
  private readonly http = inject(HttpClient);

  /** API URL for categories list. Response: Category[] (or wrap in ApiResponse if your API does). */
  @Input() categoryApiUrl!: string;
  /**
   * Base URL for subcategory datapoints.
   * We call: {subCategoryDataApiUrl}/subcategories/{subCategoryId}/datapoints
   * e.g. https://api.example.com/api/report-definitions
   */
  @Input() subCategoryDataApiUrl!: string;
  /** Optional custom chart colors (e.g. ['#10B981', '#F59E0B', ...]). */
  @Input() chartColorScheme: string[] = DEFAULT_CHART_COLORS;

  /** Selected category (from dropdown). */
  selectedCategory = signal<Category | null>(null);
  /** Selected subcategory (from pills). */
  selectedSubCategory = signal<SubCategory | null>(null);
  /** Categories from API (categoryApiUrl). */
  categories = signal<Category[]>([]);
  /** Data points from API B (subCategoryDataApiUrl + subCategoryId). */
  dataPoints = signal<DataPoint[]>([]);
  /** Currently selected data point tile (drives the chart). */
  selectedDataPoint = signal<DataPoint | null>(null);

  /** Loading states. */
  categoriesLoading = signal(false);
  categoriesError = signal<string | null>(null);
  dataPointsLoading = signal(false);
  dataPointsError = signal<string | null>(null);

  /** Search term for category dropdown filter (used with ngx-mat-select-search). */
  categoryFilterControl = new FormControl<string>('', { nonNullable: false });
  private categoryFilterTerm = toSignal(
    this.categoryFilterControl.valueChanges.pipe(startWith(this.categoryFilterControl.value ?? '')),
    { initialValue: this.categoryFilterControl.value ?? '' }
  );
  /** Filtered categories for dropdown (by name). */
  filteredCategories = computed(() => {
    const list = this.categories();
    const term = ((this.categoryFilterTerm() ?? '') as string).toLowerCase().trim();
    if (!term) return list;
    return list.filter((c) => c.name.toLowerCase().includes(term));
  });

  /** Compare fn for mat-select value (category). */
  compareCategories = (a: Category | null, b: Category | null): boolean =>
    a?.id === b?.id && a?.name === b?.name;

  /** Chart view size (responsive). Adjust in AfterViewInit or via container. */
  chartView: [number, number] = [400, 300];

  @ViewChild('chartContainer') chartContainerRef?: ElementRef<HTMLElement>;

  /** Subcategories of the selected category (for pills). */
  subCategories = computed(() => {
    const cat = this.selectedCategory();
    return cat?.subCategories ?? [];
  });

  /** Active chart data: normalized for ngx-charts (results for pie/donut/bar, multi for line/area). */
  activeChartData = computed(() => {
    const dp = this.selectedDataPoint();
    if (!dp?.chartData) return null;
    const type = dp.chartType;
    const raw = dp.chartData as any;
    // pie/donut/bar expect results: { name, value }[]
    if (type === 'pie' || type === 'donut' || type === 'bar') {
      if (Array.isArray(raw) && raw.length > 0) return raw;
      if (raw?.results) return raw.results;
      return null;
    }
    // line/area expect multi: { name, series: { name, value }[] }[]
    if (type === 'line' || type === 'area') {
      if (Array.isArray(raw) && raw.length > 0) return raw;
      if (raw?.multi) return raw.multi;
      return null;
    }
    return null;
  });

  /** Chart type for template (ngx-charts component name). */
  activeChartType = computed(() => this.selectedDataPoint()?.chartType ?? null);

  constructor() {
    // When selected category changes, clear subcategory selection and data points until user picks a pill.
    effect(() => {
      this.selectedCategory();
      this.selectedSubCategory.set(null);
      this.dataPoints.set([]);
      this.selectedDataPoint.set(null);
    });
  }

  ngOnInit(): void {
    if (this.categoryApiUrl) {
      this.loadCategories();
    }
  }

  ngAfterViewInit(): void {
    this.updateChartView();
  }

  /**
   * Load categories from categoryApiUrl.
   * Expected backend shape (as in /api/report-definitions/categories):
   * { isSuccessful: boolean; message: string; data: CategoryApiResponse[] }
   */
  loadCategories(): void {
    if (!this.categoryApiUrl) return;
    this.categoriesLoading.set(true);
    this.categoriesError.set(null);
    this.http
      .get<any>(this.categoryApiUrl)
      .pipe(
        map((res: any) => {
          const rawList: CategoryApiResponse[] = Array.isArray(res)
            ? (res as CategoryApiResponse[])
            : (res?.data as CategoryApiResponse[]) ?? [];

          return (rawList ?? []).map((cat) => ({
            id: cat.id,
            name: cat.name,
            subCategories: (cat.subCategories ?? []).map((sub) => ({
              id: sub.id,
              name: sub.name,
              // We treat the API's subcategory id as the subCategoryId we send to API B.
              subCategoryId: sub.id,
            })),
          }));
        }),
        tap((normalized) => {
          this.categories.set(normalized);
          this.categoriesLoading.set(false);
          // By default first category and first subcategory (tab) selected
          if (normalized?.length > 0) {
            this.selectedCategory.set(normalized[0]);
            const firstCat = normalized[0];
            const subs = firstCat.subCategories ?? [];
            if (subs.length > 0) {
              const firstSub = subs[0];
              setTimeout(() => {
                this.selectedSubCategory.set(firstSub);
                this.loadDataPointsForSubCategory(firstSub.subCategoryId);
              }, 0);
            }
          }
        }),
        catchError((err) => {
          this.categoriesLoading.set(false);
          this.categoriesError.set(err?.message ?? 'Failed to load categories');
          return of([]);
        })
      )
      .subscribe();
  }

  /**
   * Call GET {subCategoryDataApiUrl}/subcategories/{subCategoryId}/datapoints
   * Response: { isSuccessful, message, data: ReportDefinitionDataPointApi[] }
   */
  loadDataPointsForSubCategory(subCategoryId: string | number): void {
    if (!this.subCategoryDataApiUrl) return;
    this.dataPointsLoading.set(true);
    this.dataPointsError.set(null);
    const url = `${this.subCategoryDataApiUrl.replace(/\/$/, '')}/subcategories/${encodeURIComponent(
      String(subCategoryId)
    )}/datapoints`;

    this.http
      .get<{ isSuccessful?: boolean; message?: string; data?: ReportDefinitionDataPointApi[] }>(url)
      .pipe(
        map((res: any) => {
          const rawList: ReportDefinitionDataPointApi[] = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
          return rawList.map((item) => this.mapApiDataPointToDataPoint(item));
        }),
        tap((points: DataPoint[]) => {
          this.dataPoints.set(points);
          const first = points[0];
          this.selectedDataPoint.set(first ?? null);
          this.dataPointsLoading.set(false);
        }),
        catchError((err) => {
          this.dataPointsLoading.set(false);
          this.dataPointsError.set(err?.message ?? 'Failed to load report data');
          return of([]);
        })
      )
      .subscribe();
  }

  /** Map API datapoint (id, name, chartType) to our DataPoint (title, value, chartType). */
  private mapApiDataPointToDataPoint(item: ReportDefinitionDataPointApi): DataPoint {
    const chartType = this.normalizeChartType(item.chartType);
    return {
      id: item.id,
      title: item.name,
      subtitle: item.description ?? undefined,
      value: '—',
      unit: '',
      changePercentage: undefined,
      chartType,
      chartData: undefined,
    };
  }

  /** API sends KPI_CARD, BAR, PIE etc. – map to our pie | donut | line | bar | area */
  private normalizeChartType(apiChartType: string): DataPoint['chartType'] {
    const t = (apiChartType || '').toUpperCase();
    if (t === 'PIE') return 'pie';
    if (t === 'BAR') return 'bar';
    if (t === 'KPI_CARD') return 'donut';
    if (t === 'LINE') return 'line';
    if (t === 'AREA') return 'area';
    return 'donut';
  }

  onCategoryChange(category: Category | null): void {
    this.selectedCategory.set(category ?? null);
  }

  onSubCategoryClick(sub: SubCategory): void {
    this.selectedSubCategory.set(sub);
    this.loadDataPointsForSubCategory(sub.subCategoryId);
  }

  onDataPointClick(dp: DataPoint): void {
    this.selectedDataPoint.set(dp);
  }

  isSubCategoryActive(sub: SubCategory): boolean {
    return this.selectedSubCategory()?.id === sub.id;
  }

  isDataPointActive(dp: DataPoint): boolean {
    return this.selectedDataPoint()?.id === dp.id;
  }

  /** First 3 tiles = left column, next 2 = right column (screenshot layout). */
  dataPointsSlice(start: number, end: number): DataPoint[] {
    return this.dataPoints().slice(start, end);
  }

  /** Green/red class for change percentage. */
  changeClass(changePercentage: number): string {
    if (changePercentage > 0) return 'change-positive';
    if (changePercentage < 0) return 'change-negative';
    return 'change-neutral';
  }

  formatChange(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  }

  private updateChartView(): void {
    if (this.chartContainerRef?.nativeElement) {
      const w = this.chartContainerRef.nativeElement.offsetWidth || 400;
      const h = Math.min(320, Math.max(280, w * 0.6));
      this.chartView = [w, h];
    }
  }
}
