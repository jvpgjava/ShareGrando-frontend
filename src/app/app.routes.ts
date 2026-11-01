import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'login', pathMatch: 'full', redirectTo: 'app' },
  {
    path: 'app',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (module) => module.DashboardComponent,
      ),
  },
  {
    path: 'join',
    loadComponent: () =>
      import('./features/join/join.component').then((module) => module.JoinComponent),
  },
  {
    path: 'share/:code',
    loadComponent: () =>
      import('./features/publisher/publisher.component').then(
        (module) => module.PublisherComponent,
      ),
  },
  {
    path: 'w/:code',
    loadComponent: () =>
      import('./features/viewer/viewer.component').then((module) => module.ViewerComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'app' },
  { path: '**', redirectTo: 'app' },
];
