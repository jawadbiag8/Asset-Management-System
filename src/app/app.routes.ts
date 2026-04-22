import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { ActiveIncidentsComponent } from './components/incidents/active-incidents/active-incidents.component';
import { IncidentDetailsComponent } from './components/incidents/incident-details/incident-details.component';
import { MinistryDetailComponent } from './components/ministry-detail/ministry-detail.component';
import { ManageDigitalAssetsComponent } from './components/manage-digital-assets/manage-digital-assets.component';
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';
import { ViewAssetsDetailComponent } from './components/view-assets-detail/view-assets-detail.component';
import { CanDeactivateGuard } from './guards/can-deactivate.guard';
import { AssetControlPanelComponent } from './components/assets/asset-control-panel/asset-control-panel.component';
import { AssetAuditLogComponent } from './components/assets/asset-audit-log/asset-audit-log.component';
import { AssetsComponent } from './components/assets/assets.component';
import { PmDashboardComponent } from './components/pm-dashboard/pm-dashboard.component';
import { MinistryDashboardComponent } from './components/ministry-dashboard/ministry-dashboard.component';
import { MinistryCorrespondenceHistoryComponent } from './components/ministry-correspondence-history/ministry-correspondence-history.component';
import { ReportsPageComponent } from './components/reports-page/reports-page.component';
import { SetupComponent } from './components/setup/setup.component';
import { SetupHomeComponent } from './components/setup/setup-home/setup-home.component';
import { SetupConfigurationsComponent } from './components/setup/setup-configurations/setup-configurations.component';
import { SetupMinistriesComponent } from './components/setup/setup-ministries/setup-ministries.component';
import { SetupMinistryFormComponent } from './components/setup/setup-ministry-form/setup-ministry-form.component';
import { SetupMinistryHistoryComponent } from './components/setup/setup-ministry-history/setup-ministry-history.component';
import { ManageServicesComponent } from './components/manage-services/manage-services.component';
import { ServiceDetailComponent } from './components/service-detail/service-detail.component';
import { VendorsComponent } from './components/vendors/vendors.component';
import { AddVendorComponent } from './components/vendors/add-vendor.component';
import { VendorDetailComponent } from './components/vendors/vendor-detail.component';
import { MinistryInfoCardComponent } from './components/ministry-info-card/ministry-info-card.component';
import { VendorManagementComponent } from './components/vendor-management/vendor-management.component';
import { VendorManagementDetailComponent } from './components/vendor-management-detail/vendor-management-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  // { path: 'dashboard', redirectTo: 'asset', pathMatch: 'full' },
  {
    path: 'asset',
    component: AssetsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'ministries',
    component: MinistryDashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'ministry-correspondence-history',
    component: MinistryCorrespondenceHistoryComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'ministry-info-card-preview',
    component: MinistryInfoCardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'asset/by-ministry',
    redirectTo: 'ministries',
    pathMatch: 'full',
  },
  {
    path: 'asset-control-panel',
    component: AssetControlPanelComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'asset-audit-log',
    component: AssetAuditLogComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'ministry-detail',
    component: MinistryDetailComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'service-detail',
    component: ServiceDetailComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'view-assets-detail',
    component: ViewAssetsDetailComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'add-digital-assets',
    component: ManageDigitalAssetsComponent,
    canActivate: [AuthGuard],
    canDeactivate: [CanDeactivateGuard],
  },
  {
    path: 'edit-digital-asset',
    component: ManageDigitalAssetsComponent,
    canActivate: [AuthGuard],
    canDeactivate: [CanDeactivateGuard],
  },
  {
    path: 'add-new-service',
    component: ManageServicesComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'incidents',
    component: ActiveIncidentsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'incidents/:id',
    component: IncidentDetailsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'pm-dashboard',
    component: PmDashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'vendor',
    component: VendorManagementComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'vendor/:id',
    component: VendorManagementDetailComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'reports',
    component: ReportsPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'setup',
    component: SetupComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: SetupHomeComponent },
      { path: 'configurations', component: SetupConfigurationsComponent },
      { path: 'ministries', component: SetupMinistriesComponent },
      { path: 'ministries/new', component: SetupMinistryFormComponent },
      { path: 'ministries/:id/history', component: SetupMinistryHistoryComponent },
      { path: 'ministries/:id/edit', component: SetupMinistryFormComponent },
      { path: 'vendors', component: VendorsComponent },
      { path: 'vendors/new', component: AddVendorComponent },
      { path: 'vendors/:id/profile', component: VendorDetailComponent },
      // Future:
      // { path: 'users', component: SetupUsersComponent },
      // { path: 'roles', component: SetupRolesComponent },
    ],
  },
];



