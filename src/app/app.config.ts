import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

/**
 * Configuración global de la app. `main.ts` la pasa al arrancar.
 *
 * Los "providers" activan funcionalidades de Angular para toda la app. Aquí se
 * añadirán más cuando hagan falta (p. ej. el service worker de la PWA).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Captura los errores que nadie ha gestionado y los muestra en la consola
    // del navegador, para poder depurarlos.
    provideBrowserGlobalErrorListeners(),

    // Activa el router con las rutas de `app.routes.ts`.
    // `withComponentInputBinding` hace que los parámetros de la URL lleguen a la
    // pantalla como `input()`: p. ej. en `/temas/:tema`, el componente podrá
    // declarar `tema = input<string>()` y recibirlo sin más código.
    provideRouter(routes, withComponentInputBinding()),
  ],
};
