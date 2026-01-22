import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: false,
})
export class DashboardComponent {

  dashboardKpis = signal<any[]>([
    {
      id: 1,
      title: 'Total  Digital Assets Monitored',
      subTitle: 'Active monitoring across all departments',
      value: '247',
      subValue: '+12',
      subValueText: '+12 Assets from last month'
    },
    {
      id: 2,
      title: 'Total  Digital Assets Monitored',
      subTitle: 'Active monitoring across all departments',
      value: '247',
      subValue: '+12',
      subValueText: '+12 Assets from last month'
    },
    {
      id: 3,
      title: 'Total  Digital Assets Monitored',
      subTitle: 'Active monitoring across all departments',
      value: '247',
      subValue: '+12',
      subValueText: '+12 Assets from last month'
    },
    {
      id: 4,
      title: 'Total  Digital Assets Monitored',
      subTitle: 'Active monitoring across all departments',
      value: '247',
      subValue: '+12',
      subValueText: '+12 Assets from last month'
    },
    {
      id: 5,
      title: 'Total  Digital Assets Monitored',
      subTitle: 'Active monitoring across all departments',
      value: '247',
      subValue: '+12',
      subValueText: '+12 Assets from last month'
    },
    {
      id: 6,
      title: 'Total  Digital Assets Monitored',
      subTitle: 'Active monitoring across all departments',
      value: '247',
      subValue: '+12',
      subValueText: '+12 Assets from last month'
    },
    {
      id: 7,
      title: 'Total  Digital Assets Monitored',
      subTitle: 'Active monitoring across all departments',
      value: '247',
      subValue: '+12',
      subValueText: '+12 Assets from last month'
    }
  ]);

}
