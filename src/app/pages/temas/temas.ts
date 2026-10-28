import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Pestaña "Temas" (ruta `/temas`).
 *
 * Provisional: de momento solo muestra el título para que la pestaña funcione.
 * Aquí irá la lista de los 14 temas con el % de acierto de cada uno y un botón
 * para practicar solo ese tema.
 *
 * La plantilla va dentro (`template`) en vez de en un `.html` aparte porque es muy corta.
 */
@Component({
  selector: 'app-temas',
  template: `
    <div class="pagina">
      <h1 class="titulo-grande">Temas</h1>
      <p class="mt-2 text-texto-2">Próximamente: práctica libre por tema.</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Temas {}
