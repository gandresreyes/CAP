import { Routes } from '@angular/router';

export const routes: Routes = [
  // Mientras no exista la pantalla de Inicio, se entra directo al repaso.
  { path: '', pathMatch: 'full', redirectTo: 'repaso' },
  {
    path: 'repaso',
    title: 'Repaso · CAP Estudio',
    loadComponent: () => import('./pages/repaso/repaso').then((m) => m.Repaso),
  },
  { path: '**', redirectTo: '' },
];
