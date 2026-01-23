import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { AssetsByMinistryComponent } from './components/assets/assetsByMinistry/assets-by-ministry.component';
import { ActiveIncidentsComponent } from './components/incidents/active-incidents/active-incidents.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'assets/by-ministry', component: AssetsByMinistryComponent },
  { path: 'incidents', component: ActiveIncidentsComponent },
];
