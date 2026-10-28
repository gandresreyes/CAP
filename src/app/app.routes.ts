import { Routes } from '@angular/router';

/**
 * Rutas de la app: qué pantalla se muestra para cada URL.
 *
 * Todas usan `loadComponent` con `import()`: el código de cada pantalla se
 * descarga solo cuando se visita por primera vez (lazy loading). Así la app
 * arranca más rápido, sobre todo en móvil con mala conexión.
 *
 * `title` es el texto de la pestaña del navegador en esa pantalla.
 */
export const routes: Routes = [
  // Pantallas principales, con barra inferior.
  // La ruta padre (`''`) carga el layout `Pestanas`, que pinta la barra; sus hijas
  // se pintan dentro del layout.
  {
    path: '',
    loadComponent: () => import('./shared/components/pestanas/pestanas').then((m) => m.Pestanas),
    children: [
      {
        // `pathMatch: 'full'`: solo para la URL exacta `/`, no para cualquier
        // URL que empiece por `/` (que serían todas).
        path: '',
        pathMatch: 'full',
        title: 'CAP Estudio',
        loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio),
      },
      {
        path: 'temas',
        title: 'Temas · CAP Estudio',
        loadComponent: () => import('./pages/temas/temas').then((m) => m.Temas),
      },
      {
        path: 'progreso',
        title: 'Progreso · CAP Estudio',
        loadComponent: () => import('./pages/progreso/progreso').then((m) => m.Progreso),
      },
    ],
  },

  // Pantallas completas, sin barra: fuera del layout de pestañas.
  {
    path: 'repaso',
    title: 'Repaso · CAP Estudio',
    loadComponent: () => import('./pages/repaso/repaso').then((m) => m.Repaso),
  },
  {
    path: 'simulacro',
    title: 'Simulacro · CAP Estudio',
    loadComponent: () => import('./pages/simulacro/simulacro').then((m) => m.Simulacro),
  },
  {
    path: 'acerca-de',
    title: 'Acerca de · CAP Estudio',
    loadComponent: () => import('./pages/acerca-de/acerca-de').then((m) => m.AcercaDe),
  },

  // Cualquier otra URL (mal escrita o antigua) redirige al inicio en vez de
  // mostrar una pantalla en blanco. Tiene que ir la última: las rutas se
  // comprueban en orden y `**` coincide con todo.
  { path: '**', redirectTo: '' },
];
