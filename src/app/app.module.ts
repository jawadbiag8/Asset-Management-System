import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DashboardkpiComponent } from './components/dashboardkpi/dashboardkpi.component';
import { ReusableTableComponent } from './components/reusable/reusable-table/reusable-table.component';
import { ReusableBreadcrumComponent } from './components/reusable/reusable-breadcrum/reusable-breadcrum.component';
import { HeaderComponent } from './layout/header/header.component';
import { MinistryDetailComponent } from './components/ministry-detail/ministry-detail.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    DashboardkpiComponent,
    ReusableTableComponent,
    ReusableBreadcrumComponent,
    HeaderComponent,
    MinistryDetailComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
    BrowserAnimationsModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    MatChipsModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
