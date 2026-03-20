import { Component } from '@angular/core';
import { DynamicReportComponent } from '../dynamic-report/dynamic-report.component';

/**
 * Reports page – DynamicReportComponent wired to real APIs.
 *
 * - Categories: GET /api/report-definitions/categories
 * - Datapoints: GET /api/report-definitions/subcategories/{subcategoryId}/datapoints
 *   (tab click pe subcategory id path mein bhejte hain)
 */
@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [DynamicReportComponent],
  template: `
    <app-dynamic-report
      [categoryApiUrl]="categoryApiUrl"
      [subCategoryDataApiUrl]="subCategoryDataApiUrl"
      [chartColorScheme]="chartColors"
    />
  `,
  styles: [':host { display: block; height: 100%; }'],
})
export class ReportsPageComponent {
  private readonly apiBase = 'http://47.129.240.107:7008/api';

  categoryApiUrl = `${this.apiBase}/report-definitions/categories`;

  /** Base for datapoints: component calls {subCategoryDataApiUrl}/subcategories/{id}/datapoints */
  subCategoryDataApiUrl = `${this.apiBase}/report-definitions`;

  chartColors = ['#10B981', '#F59E0B', '#EF4444', '#008080', '#6366F1'];
}
