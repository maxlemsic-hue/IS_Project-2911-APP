import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
  { path: 'products', loadComponent: () => import('./catalog/catalog').then((m) => m.Catalog) },
  { path: 'orders', loadComponent: () => import('./orders/orders').then((m) => m.Orders) },
];
