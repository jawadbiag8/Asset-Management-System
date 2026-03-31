import { Component } from '@angular/core';
import { DynamicReportComponent } from '../dynamic-report/dynamic-report.component';

/**
 * Reports page – core reports APIs (categories → sub-categories → data-points) via DynamicReportComponent.
 */
@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [DynamicReportComponent],
  template: `
    <app-dynamic-report [chartColorScheme]="chartColors" />
  `,
  styles: [':host { display: block; height: 100%; }'],
})
export class ReportsPageComponent {
  /** Aligns with CX Dashboard / PDA: green, amber, red, teal, indigo. */
  chartColors = ['#10B981', '#F59E0B', '#EF4444', '#008080', '#6366F1'];
}
