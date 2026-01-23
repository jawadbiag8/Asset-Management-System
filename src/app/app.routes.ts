import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { MinistryDetailComponent } from './components/ministry-detail/ministry-detail.component';
import { ManageDigitalAssetsComponent } from './components/manage-digital-assets/manage-digital-assets.component';
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'ministry-detail', 
    component: MinistryDetailComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'add-digital-assets', 
    component: ManageDigitalAssetsComponent, 
    canActivate: [AuthGuard] 
  },
];
