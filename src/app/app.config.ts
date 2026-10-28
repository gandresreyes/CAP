import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { Instalacion } from './shared/services/instalacion';

/**
 * Configuración global de la app. `main.ts` la pasa al arrancar.
 *
 * Los "providers" activan funcionalidades de Angular para toda la app.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Captura los errores que nadie ha gestionado y los muestra en la consola
    // del navegador, para poder depurarlos.
    provideBrowserGlobalErrorListeners(),

    // Activa el router con las rutas de `app.routes.ts`.
    // `withComponentInputBinding` hace que los parámetros de la URL lleguen a la
    // pantalla como `input()`: p. ej. en `/repaso?tema=…`, el componente declara
    // `tema = input<string>()` y lo recibe sin más código.
    provideRouter(routes, withComponentInputBinding()),

    // Service worker de la PWA (`ngsw-worker.js`, lo genera `ng build`): guarda una
    // copia de la app y de las preguntas en el móvil para que funcione sin conexión,
    // y descarga las versiones nuevas en segundo plano. Qué se guarda y cómo está en
    // `ngsw-config.json`.
    // - `enabled: !isDevMode()`: solo en la build de producción; con `ng serve` está
    //   desactivado (si no, se quedaría con versiones viejas mientras programas).
    // - `registerWhenStable:30000`: se instala cuando la app termina de arrancar (o a
    //   los 30 s como mucho), para no competir con la carga inicial.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

    // Crea el servicio de instalación nada más arrancar (`provideAppInitializer`
    // ejecuta la función antes de pintar la primera pantalla). Así escucha desde el
    // principio el aviso de "se puede instalar" de Chrome, que llega una sola vez al
    // cargar la página y se perdería si se esperase a abrir Inicio.
    provideAppInitializer(() => {
      inject(Instalacion);
    }),
  ],
};
