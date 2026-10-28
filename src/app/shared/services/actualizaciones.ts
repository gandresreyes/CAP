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
 * En desarrollo (`ng serve`) el service worker está desactivado y el aviso nunca sale.
 */
@Injectable({ providedIn: 'root' })
export class Actualizaciones {
  private readonly sw = inject(SwUpdate);

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
