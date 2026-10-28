import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Componente raíz: el primero que arranca (`main.ts` lo inicia) y el único que
 * está siempre en pantalla.
 *
 * Solo contiene un contenedor centrado con ancho de móvil y, dentro, el
 * `<router-outlet>`, que es donde el router pinta la pantalla de la URL actual
 * (ver `app.routes.ts`). Nada más: cada pantalla se encarga de lo suyo.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
