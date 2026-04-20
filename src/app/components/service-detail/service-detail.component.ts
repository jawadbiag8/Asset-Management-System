import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { IntegrateApiDialogComponent } from '../reusable/integrate-api-dialog/integrate-api-dialog.component';
import {
  AddManualStepDialogComponent,
  AddManualStepDialogData,
} from '../reusable/add-manual-step-dialog/add-manual-step-dialog.component';
import {
  ApiService,
  ServiceDetailData,
  ServiceStepEventMetricRow,
  ServiceStepItem,
} from '../../services/api.service';

@Component({
  selector: 'app-service-detail',
  standalone: false,
  templateUrl: './service-detail.component.html',
  styleUrl: './service-detail.component.scss',
})
export class ServiceDetailComponent implements OnInit, OnDestroy {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly detail = signal<ServiceDetailData | null>(null);

  serviceId: number | null = null;
  ministryId: number | null = null;

  /** Expanded step ids */
  readonly expandedIds = signal<Set<number>>(new Set());

  /** Per-step event rows from GET .../steps/{stepName}/events/metrics */
  private readonly eventRowsByStepId = signal<Record<number, ServiceStepEventMetricRow[]>>({});
  private readonly eventLoadingByStepId = signal<Record<number, boolean>>({});
  private readonly eventErrorByStepId = signal<Record<number, string | null>>({});

  /** Summary tiles: match dashboard cards (value, title, subtitle, footer link). */
  readonly summaryCards = computed(() => {
    const d = this.detail();
    const s = d?.summary;
    if (!s) return [];
    return [
      {
        title: 'Total Forms',
        value: String(s.totalForms),
        subTitle: 'Forms and steps configured for this service.',
      },
      {
        title: 'Linked Assets',
        value: String(s.linkedAssets),
        subTitle: 'Digital assets mapped to this service.',
      },
      {
        title: 'Total Occurrences',
        value: String(s.totalOccurrences),
        subTitle: 'Aggregated traffic across all steps.',
      },
      {
        title: 'Success Rate',
        value: s.successRate,
        subTitle: 'Overall completion performance.',
      },
      {
        title: 'Digital %',
        value: s.digitalPercentage,
        subTitle: 'Share of digital vs non-digital flow.',
      },
    ];
  });

  readonly steps = computed(() => this.detail()?.steps ?? []);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ApiService,
    private readonly breadcrumb: BreadcrumbService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const sid = params['serviceId'];
      const mid = params['ministryId'];
      this.serviceId = sid != null ? +sid : null;
      this.ministryId = mid != null ? +mid : null;
      if (this.serviceId && Number.isFinite(this.serviceId)) {
        this.load();
      } else {
        this.error.set('Missing or invalid service.');
        this.detail.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    this.breadcrumb.setCurrentLabel(null);
  }

  private load(): void {
    if (!this.serviceId) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.getServiceById(this.serviceId).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.isSuccessful && res.data) {
          this.detail.set(res.data);
          this.breadcrumb.setCurrentLabel(res.data.serviceName);
        } else {
          this.error.set(res.message || 'Could not load service.');
          this.detail.set(null);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load service.');
        this.detail.set(null);
      },
    });
  }

  /** Expand/collapse row; ignores clicks that originate from the Edit control. */
  onStepHeaderClick(step: ServiceStepItem, event: MouseEvent): void {
    const el = event.target as HTMLElement | null;
    if (el?.closest('.step-edit-btn')) return;
    this.toggleStep(step);
  }

  onEditStep(step: ServiceStepItem, index: number, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.serviceId) return;
    const currentOrder = step.displayOrder ?? index + 1;
    this.api.getServiceStepOrderLimits(this.serviceId).subscribe({
      next: (res) => {
        const max =
          res.isSuccessful && res.data?.mergedStepCount && res.data.mergedStepCount > 0
            ? res.data.mergedStepCount
            : res.isSuccessful && res.data?.maxAvailableDisplayOrder && res.data.maxAvailableDisplayOrder > 0
              ? res.data.maxAvailableDisplayOrder
              : 3;
        const base = Array.from({ length: max }, (_, i) => i + 1);
        this.openManualStepDialog(this.mergePlacementWithCurrent(base, currentOrder), {
          step,
          stepIndex: index,
        });
      },
      error: () => {
        this.openManualStepDialog(this.mergePlacementWithCurrent([1, 2, 3], currentOrder), {
          step,
          stepIndex: index,
        });
      },
    });
  }

  private mergePlacementWithCurrent(base: number[], currentOrder: number): number[] {
    const set = new Set(base);
    set.add(currentOrder);
    return Array.from(set).sort((a, b) => a - b);
  }

  toggleStep(step: ServiceStepItem): void {
    const id = step.id;
    const willExpand = !this.expandedIds().has(id);
    this.expandedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (willExpand) {
      this.loadStepEventMetrics(step);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  isStepEventsLoading(stepId: number): boolean {
    return this.eventLoadingByStepId()[stepId] === true;
  }

  getStepEventError(stepId: number): string | null {
    return this.eventErrorByStepId()[stepId] ?? null;
  }

  getStepEventRows(stepId: number): ServiceStepEventMetricRow[] {
    return this.eventRowsByStepId()[stepId] ?? [];
  }

  /** Display label for API event keys (e.g. form_submitted → Form submitted). */
  formatEventName(eventName: string): string {
    const s = (eventName || '').trim();
    if (!s) return '—';
    return s
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private loadStepEventMetrics(step: ServiceStepItem): void {
    if (!this.serviceId) return;
    const stepName = step.stepName?.trim();
    if (!stepName) {
      this.patchEventState(step.id, {
        loading: false,
        error: 'Missing step name.',
        rows: [],
      });
      return;
    }

    this.patchEventState(step.id, { loading: true, error: null, rows: [] });

    this.api.getServiceStepEventMetrics(this.serviceId, stepName).subscribe({
      next: (res) => {
        const rows = res.data?.byEventName ?? res.data?.byEventType ?? [];
        if (res.isSuccessful) {
          this.patchEventState(step.id, {
            loading: false,
            error: null,
            rows,
          });
        } else {
          this.patchEventState(step.id, {
            loading: false,
            error: res.message || 'No event metrics.',
            rows: [],
          });
        }
      },
      error: () => {
        this.patchEventState(step.id, {
          loading: false,
          error: 'Failed to load event metrics.',
          rows: [],
        });
      },
    });
  }

  private patchEventState(
    stepId: number,
    patch: { loading: boolean; error: string | null; rows?: ServiceStepEventMetricRow[] },
  ): void {
    if (patch.rows !== undefined) {
      this.eventRowsByStepId.update((prev) => ({ ...prev, [stepId]: patch.rows! }));
    }
    this.eventLoadingByStepId.update((prev) => ({ ...prev, [stepId]: patch.loading }));
    this.eventErrorByStepId.update((prev) => ({ ...prev, [stepId]: patch.error }));
  }

  formatAvgTime(msRaw: string | undefined): string {
    if (msRaw == null || msRaw === '' || msRaw.toUpperCase() === 'N/A') {
      return 'N/A';
    }
    const n = Number(msRaw);
    if (!Number.isFinite(n) || n < 0) return 'N/A';
    const minutes = n / (60 * 1000);
    if (minutes >= 60) {
      const h = minutes / 60;
      return `${h.toFixed(1)} hours`;
    }
    if (minutes >= 1) {
      return `${minutes.toFixed(1)} min`;
    }
    const sec = n / 1000;
    return `${sec.toFixed(1)} s`;
  }

  parsePercentWidth(rate: string | undefined): number {
    if (!rate || rate.toUpperCase() === 'N/A') return 0;
    const m = String(rate).match(/([\d.]+)/);
    if (!m) return 0;
    const v = parseFloat(m[1]);
    return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
  }

  stepTitle(step: ServiceStepItem, index: number): string {
    const label = step.isManual ? 'Manual Step' : 'Form';
    const name = step.stepName?.trim() || 'Untitled';
    return `${label} ${index + 1} - ${name}`;
  }

  goBackToMinistry(): void {
    if (this.ministryId != null) {
      this.router.navigate(['/ministry-detail'], {
        queryParams: { ministryId: this.ministryId },
      });
      return;
    }
    this.router.navigate(['/ministries']);
  }

  goToAddManualStep(): void {
    if (!this.serviceId) return;
    this.api.getServiceStepOrderLimits(this.serviceId).subscribe({
      next: (res) => {
        const max =
          res.isSuccessful && res.data?.maxAvailableDisplayOrder && res.data.maxAvailableDisplayOrder > 0
            ? res.data.maxAvailableDisplayOrder
            : 3;
        const placementOptions = Array.from({ length: max }, (_, i) => i + 1);
        this.openManualStepDialog(placementOptions);
      },
      error: () => {
        this.openManualStepDialog([1, 2, 3]);
      },
    });
  }

  private openManualStepDialog(
    placementOptions: number[],
    edit?: { step: ServiceStepItem; stepIndex: number },
  ): void {
    if (!this.serviceId) return;

    const data: AddManualStepDialogData = edit
      ? {
          serviceId: this.serviceId,
          placementOptions,
          mode: 'edit',
          stepId: edit.step.id,
          isManual: edit.step.isManual,
          initial: {
            stepName: edit.step.stepName ?? '',
            description: edit.step.description ?? '',
            displayOrder: edit.step.displayOrder ?? edit.stepIndex + 1,
          },
        }
      : { serviceId: this.serviceId, placementOptions };

    const ref = this.dialog.open(AddManualStepDialogComponent, {
      panelClass: 'add-manual-step-dialog-panel',
      width: '520px',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      data,
    });
    ref.afterClosed().subscribe((success) => {
      if (success) this.load();
    });
  }

  onIntegrateApis(): void {
    const assets = this.detail()?.assets ?? [];
    this.dialog.open(IntegrateApiDialogComponent, {
      panelClass: 'integrate-api-dialog-panel',
      width: '480px',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      data: { assets },
    });
  }
}
