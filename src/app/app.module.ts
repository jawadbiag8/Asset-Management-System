import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ToastrModule } from 'ngx-toastr';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DashboardkpiComponent } from './components/dashboardkpi/dashboardkpi.component';
import { ReusableTableComponent } from './components/reusable/reusable-table/reusable-table.component';
import { ManageDigitalAssetsComponent } from './components/manage-digital-assets/manage-digital-assets.component';
import { ReusableBreadcrumComponent } from './components/reusable/reusable-breadcrum/reusable-breadcrum.component';
import { ReusableInputComponent } from './components/reusable/reusable-input/reusable-input.component';
import { FilterModalComponent } from './components/reusable/filter-modal/filter-modal.component';
import { HeaderComponent } from './layout/header/header.component';
import { AssetsByMinistryComponent } from './components/assets/assetsByMinistry/assets-by-ministry.component';
import { ActiveIncidentsComponent } from './components/incidents/active-incidents/active-incidents.component';
import { ManageIncidentsComponent } from './components/incidents/manage-incidents/manage-incidents.component';
import { IncidentDetailsComponent } from './components/incidents/incident-details/incident-details.component';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MinistryDetailComponent } from './components/ministry-detail/ministry-detail.component';
import { firstValueFrom } from 'rxjs';
import { ApiInterceptor } from './interceptors/api.interceptor';
import { UtilsService } from './services/utils.service';
import { ViewAssetsDetailComponent } from './components/view-assets-detail/view-assets-detail.component';
import { ConfirmationDialogComponent } from './components/reusable/confirmation-dialog/confirmation-dialog.component';
import { UploadDocumentDialogComponent } from './components/reusable/upload-document-dialog/upload-document-dialog.component';
import { LoaderComponent } from './components/loader/loader.component';
import { AssetControlPanelComponent } from './components/assets/asset-control-panel/asset-control-panel.component';
import { AssetAuditLogComponent } from './components/assets/asset-audit-log/asset-audit-log.component';
import { AssetsComponent } from './components/assets/assets.component';
import { PmDashboardComponent } from './components/pm-dashboard/pm-dashboard.component';
import { MinistryDashboardComponent } from './components/ministry-dashboard/ministry-dashboard.component';
import { MinistryCorrespondenceHistoryComponent } from './components/ministry-correspondence-history/ministry-correspondence-history.component';
import { provideHighcharts } from 'highcharts-angular';
import { ManageServicesComponent } from './components/manage-services/manage-services.component';
import { ServiceDialogComponent } from './components/reusable/service-dialog/service-dialog.component';
import { ServiceDetailComponent } from './components/service-detail/service-detail.component';
import { IntegrateApiDialogComponent } from './components/reusable/integrate-api-dialog/integrate-api-dialog.component';
import { AddManualStepDialogComponent } from './components/reusable/add-manual-step-dialog/add-manual-step-dialog.component';
import { VendorsComponent } from './components/vendors/vendors.component';
import { AddVendorComponent } from './components/vendors/add-vendor.component';
import { VendorDetailComponent } from './components/vendors/vendor-detail.component';
import { MinistryInfoCardComponent } from './components/ministry-info-card/ministry-info-card.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    DashboardkpiComponent,
    ReusableTableComponent,
    ManageDigitalAssetsComponent,
    ReusableBreadcrumComponent,
    ReusableInputComponent,
    FilterModalComponent,
    HeaderComponent,
    AssetsByMinistryComponent,
    ActiveIncidentsComponent,
    ManageIncidentsComponent,
    IncidentDetailsComponent,
    MinistryDetailComponent,
    ViewAssetsDetailComponent,
    ConfirmationDialogComponent,
    UploadDocumentDialogComponent,
    LoaderComponent,
    AssetControlPanelComponent,
    AssetAuditLogComponent,
    AssetsComponent,
    PmDashboardComponent,
    MinistryDashboardComponent,
    MinistryCorrespondenceHistoryComponent,
    ManageServicesComponent,
    ServiceDialogComponent,
    ServiceDetailComponent,
    IntegrateApiDialogComponent,
    AddManualStepDialogComponent,
    VendorsComponent,
    AddVendorComponent,
    VendorDetailComponent,
    MinistryInfoCardComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatDialogModule,
    MatMenuModule,
    NgxMatSelectSearchModule,
    ToastrModule.forRoot({
      timeOut: 7000,
      positionClass: 'toast-top-right',
      closeButton: true,
      progressBar: true,
      preventDuplicates: true
    }),
  ],
  providers: [
    provideHighcharts({
      instance: () => import('highcharts/esm/highcharts').then((m) => m.default),
      modules: () => [
        import('highcharts/esm/highcharts-more'),
        import('highcharts/esm/modules/solid-gauge'),
      ],
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiInterceptor,
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (utils: UtilsService) => () =>
        firstValueFrom(utils.getAppConfig()).then((config) => {
          if (!config || typeof (config as any).apiUrl !== 'string') {
            throw new Error('Application config could not be loaded. Please ensure assets/config.json is available.');
          }
        }),
      deps: [UtilsService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }



