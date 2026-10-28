import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';

/**
 * Avisa cuando hay una versión nueva de la app lista para usar.
 *
 * Cómo funciona la PWA: el service worker guarda una copia de la app (y de las
 * preguntas) en el móvil para que funcione sin conexión. Cuando publicas una
 * versión nueva, la descarga en segundo plano, pero la pantalla sigue mostrando
 * la antigua hasta que se recarga. Este servicio detecta ese momento
 * (`VERSION_READY`) para mostrar el aviso "Hay una versión nueva · Actualizar".
 *
 * No se recarga sola para no cortar a nadie en mitad de una pregunta (aunque el
 * repaso y el simulacro se guardan y se podrían retomar).
 *
 * Además:
 * - Busca versión nueva cada vez que la app vuelve a primer plano. En iPhone la PWA
 *   instalada no se recarga al volver del segundo plano (puede pasar días abierta),
 *   así que sin esto los compañeros tardarían mucho en ver los cambios.
 * - Si el service worker queda en un estado roto (`unrecoverable`: por ejemplo, el
 *   navegador borró parte de su caché y ya no puede servir la versión que tiene
 *   abierta), recarga la página. Es lo que recomienda la documentación de Angular:
 *   seguir sin recargar acabaría en errores al cargar pantallas.
 *
 * En desarrollo (`ng serve`) el service worker está desactivado y el aviso nunca sale.
 */
@Injectable({ providedIn: 'root' })
export class Actualizaciones {
  private readonly sw = inject(SwUpdate);

  constructor() {
    // Sin service worker (en desarrollo, o navegador sin soporte) no hay nada que vigilar.
    if (!this.sw.isEnabled) return;

    // Estado roto e irrecuperable: recargar para cargar la versión buena desde el servidor.
    // Este servicio vive toda la app (`providedIn: 'root'` y lo usa el componente raíz),
    // así que la suscripción no hace falta cancelarla.
    this.sw.unrecoverable.subscribe(() => document.location.reload());

    // Al volver a la app (`visibilitychange` con la página visible), preguntar al
    // servidor si hay versión nueva. Si la hay, se descarga y llega `VERSION_READY`,
    // que muestra el aviso. Sin conexión falla sin más: se ignora el error.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.sw.checkForUpdate().catch(() => {});
    });
  }

  /**
   * `true` cuando hay una versión nueva descargada y lista.
   *
   * `versionUpdates` es un Observable (RxJS) con los eventos del service worker.
   * `toSignal` lo convierte en signal para usarlo como el resto del estado:
   * empieza en `false` y pasa a `true` en cuanto llega un `VERSION_READY`.
   */
  readonly hayNueva = toSignal(
    this.sw.versionUpdates.pipe(
      filter((e) => e.type === 'VERSION_READY'),
      map(() => true),
    ),
    { initialValue: false },
  );

  /** Recarga la página para pasar a la versión nueva. */
  actualizar(): void {
    document.location.reload();
  }
}
