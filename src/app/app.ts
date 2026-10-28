import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Actualizaciones } from './shared/services/actualizaciones';

/**
 * Componente raíz: el primero que arranca (`main.ts` lo inicia) y el único que
 * está siempre en pantalla.
 *
 * Contiene un contenedor centrado con ancho de móvil y, dentro, el
 * `<router-outlet>`, que es donde el router pinta la pantalla de la URL actual
 * (ver `app.routes.ts`).
 *
 * También muestra, por encima de cualquier pantalla, el aviso de "versión nueva"
 * de la PWA: tiene que estar aquí porque puede llegar en cualquier momento.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** Detecta versiones nuevas de la app descargadas por el service worker. */
  protected readonly actualizaciones = inject(Actualizaciones);
}
