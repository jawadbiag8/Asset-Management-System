import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { forkJoin, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import type { FilterOption } from '../components/reusable/reusable-table/reusable-table.component';

/** Capitalize string to title case for dropdown labels (e.g. "HIGH" -> "High", "average" -> "Average"). */
function toTitleCase(s: string): string {
  if (s == null || typeof s !== 'string') return '';
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map risk index LOV value to API param: Low, Medium, High (Asset API expects these). */
function mapRiskIndexToApiValue(raw: string): string {
  const u = (raw || '').trim().toUpperCase();
  if (u.includes('LOW') || u === 'LOW') return 'Low';
  if (u.includes('MEDIUM') || u === 'MEDIUM' || u.includes('MID')) return 'Medium';
  if (u.includes('HIGH') || u === 'HIGH') return 'High';
  return '';
}

/** Same filter config as dashboard: ids and labels for menu/table filters. */
export const DASHBOARD_FILTER_MENU: { id: string; label: string }[] = [
  { id: 'ministry', label: 'Ministry' },
  { id: 'status', label: 'Status' },
  { id: 'health', label: 'Health' },
  { id: 'performance', label: 'Performance' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'riskIndex', label: 'Risk Index' },
  { id: 'citizenImpact', label: 'Citizen Impact' },
];

/**
 * Shared filter options used by dashboard and ministry-dashboard.
 * Load logic matches dashboard.component.ts loadFilterOptions() exactly.
 */
@Injectable({ providedIn: 'root' })
export class FilterOptionsService {
  readonly ministryOptions = signal<FilterOption[]>([]);
  readonly statusOptions = signal<FilterOption[]>([]);
  readonly healthOptions = signal<FilterOption[]>([]);
  readonly performanceOptions = signal<FilterOption[]>([]);
  readonly complianceOptions = signal<FilterOption[]>([]);
  readonly riskIndexOptions = signal<FilterOption[]>([]);
  readonly citizenImpactOptions = signal<FilterOption[]>([]);

  constructor(private apiService: ApiService) {}

  /**
   * Load all filter options — same forkJoin and mapping as dashboard loadFilterOptions().
   * Returns Observable that completes when done; callers subscribe and then read signals.
   */
  loadFilterOptions(): Observable<void> {
    const statusOptionsStatic: FilterOption[] = [
      { label: 'All', value: '' },
      { label: 'Online', value: 'Online' },
      { label: 'Offline', value: 'Offline' },
    ];

    return forkJoin({
      ministries: this.apiService.getAllMinistries(),
      citizenImpactLevels: this.apiService.getLovByType('citizenImpactLevel'),
      healthStatus: this.apiService.getLovByType('HealthStatus'),
      performanceStatus: this.apiService.getLovByType('PerformanceStatus'),
      complianceStatus: this.apiService.getLovByType('ComplianceStatus'),
      riskExposureIndex: this.apiService.getLovByType('RiskExposureIndex'),
    }).pipe(
      tap((responses) => {
        if (responses.ministries.isSuccessful) {
          const ministryOptions: FilterOption[] = [{ label: 'All', value: '' }];
          const ministries = Array.isArray(responses.ministries.data)
            ? responses.ministries.data
            : [];
          ministries.forEach((ministry: any) => {
            const name = ministry.ministryName || ministry.name;
            ministryOptions.push({
              label: toTitleCase(String(name ?? '')),
              value:
                ministry.id?.toString() ||
                ministry.ministryName ||
                ministry.name,
            });
          });
          this.ministryOptions.set(ministryOptions);
        } else {
          this.ministryOptions.set([{ label: 'All', value: '' }]);
        }

        this.statusOptions.set(statusOptionsStatic);

        if (responses.citizenImpactLevels.isSuccessful) {
          const citizenImpactOptions: FilterOption[] = [{ label: 'All', value: '' }];
          const citizenImpacts = Array.isArray(responses.citizenImpactLevels.data)
            ? responses.citizenImpactLevels.data
            : [];
          citizenImpacts.forEach((impact: any) => {
            citizenImpactOptions.push({
              label: toTitleCase(String(impact.name ?? '')),
              value: impact.id?.toString() ?? impact.name,
            });
          });
          this.citizenImpactOptions.set(citizenImpactOptions);
        } else {
          this.citizenImpactOptions.set([{ label: 'All', value: '' }]);
        }

        if (responses.healthStatus?.isSuccessful) {
          const healthOptions: FilterOption[] = [{ label: 'All', value: '' }];
          const items = Array.isArray(responses.healthStatus.data)
            ? responses.healthStatus.data
            : [];
          items.forEach((item: any) => {
            const label = item.name ?? item.label ?? String(item);
            healthOptions.push({
              label: toTitleCase(String(label)),
              value: item.id?.toString() ?? item.name ?? item.value ?? String(item),
            });
          });
          this.healthOptions.set(healthOptions);
        } else {
          this.healthOptions.set([{ label: 'All', value: '' }]);
        }

        if (responses.performanceStatus?.isSuccessful) {
          const performanceOptions: FilterOption[] = [{ label: 'All', value: '' }];
          const items = Array.isArray(responses.performanceStatus.data)
            ? responses.performanceStatus.data
            : [];
          items.forEach((item: any) => {
            const label = item.name ?? item.label ?? String(item);
            performanceOptions.push({
              label: toTitleCase(String(label)),
              value: item.id?.toString() ?? item.name ?? item.value ?? String(item),
            });
          });
          this.performanceOptions.set(performanceOptions);
        } else {
          this.performanceOptions.set([{ label: 'All', value: '' }]);
        }

        if (responses.complianceStatus?.isSuccessful) {
          const complianceOptions: FilterOption[] = [{ label: 'All', value: '' }];
          const items = Array.isArray(responses.complianceStatus.data)
            ? responses.complianceStatus.data
            : [];
          items.forEach((item: any) => {
            const label = item.name ?? item.label ?? String(item);
            complianceOptions.push({
              label: toTitleCase(String(label)),
              value: item.id?.toString() ?? item.name ?? item.value ?? String(item),
            });
          });
          this.complianceOptions.set(complianceOptions);
        } else {
          this.complianceOptions.set([{ label: 'All', value: '' }]);
        }

        if (responses.riskExposureIndex?.isSuccessful) {
          const riskOptions: FilterOption[] = [{ label: 'All', value: '' }];
          const items = Array.isArray(responses.riskExposureIndex.data)
            ? responses.riskExposureIndex.data
            : [];
          const seen = new Set<string>();
          items.forEach((item: any) => {
            const raw = (item.name ?? item.label ?? item.value ?? String(item)).toString().toUpperCase();
            const value = mapRiskIndexToApiValue(raw);
            if (value && !seen.has(value)) {
              seen.add(value);
              riskOptions.push({ label: toTitleCase(value), value });
            }
          });
          if (riskOptions.length <= 1) {
            this.riskIndexOptions.set([{ label: 'All', value: '' }, { label: 'Low', value: 'Low' }, { label: 'Medium', value: 'Medium' }, { label: 'High', value: 'High' }]);
          } else {
            this.riskIndexOptions.set(riskOptions);
          }
        } else {
          this.riskIndexOptions.set([{ label: 'All', value: '' }, { label: 'Low', value: 'Low' }, { label: 'Medium', value: 'Medium' }, { label: 'High', value: 'High' }]);
        }
      }),
      catchError(() => {
        this.ministryOptions.set([{ label: 'All', value: '' }]);
        this.statusOptions.set(statusOptionsStatic);
        this.citizenImpactOptions.set([{ label: 'All', value: '' }]);
        this.healthOptions.set([{ label: 'All', value: '' }]);
        this.performanceOptions.set([{ label: 'All', value: '' }]);
        this.complianceOptions.set([{ label: 'All', value: '' }]);
        this.riskIndexOptions.set([{ label: 'All', value: '' }, { label: 'Low', value: 'Low' }, { label: 'Medium', value: 'Medium' }, { label: 'High', value: 'High' }]);
        return of(undefined);
      }),
      map(() => undefined as void)
    );
  }
}
