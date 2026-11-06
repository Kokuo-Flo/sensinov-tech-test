import { type Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'priorities' },
  {
    path: 'priorities',
    title: 'Priorités — Smart Building',
    loadComponent: async () =>
      (await import('./components/priorities/priorities.component')).PrioritiesComponent,
  },
  {
    path: 'buildings',
    title: 'Bâtiments — Smart Building',
    loadComponent: async () =>
      (await import('./components/building-list/building-list.component')).BuildingListComponent,
  },
  {
    path: 'buildings/:buildingId',
    title: 'Bâtiment — Smart Building',
    loadComponent: async () =>
      (await import('./components/building-detail/building-detail.component'))
        .BuildingDetailComponent,
  },
  {
    path: 'equipments/:equipmentId',
    title: 'Équipement — Smart Building',
    loadComponent: async () =>
      (await import('./components/equipment-detail/equipment-detail.component'))
        .EquipmentDetailComponent,
  },
  {
    path: 'findings',
    title: 'Anomalies — Smart Building',
    loadComponent: async () =>
      (await import('./components/findings/findings.component')).FindingsComponent,
  },
  {
    path: 'reports',
    title: 'Rapport analyste — Smart Building',
    loadComponent: async () =>
      (await import('./components/analyst-report/analyst-report.component'))
        .AnalystReportComponent,
  },
  { path: '**', redirectTo: 'priorities' },
];
