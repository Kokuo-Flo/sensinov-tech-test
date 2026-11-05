import { type Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'buildings' },
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
    path: 'reports',
    title: 'Rapport analyste — Smart Building',
    loadComponent: async () =>
      (await import('./components/analyst-report/analyst-report.component'))
        .AnalystReportComponent,
  },
  { path: '**', redirectTo: 'buildings' },
];
