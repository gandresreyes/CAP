import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Pestaña "Progreso" (ruta `/progreso`).
 *
 * Provisional: de momento solo muestra el título para que la pestaña funcione.
 * Aquí irán el acierto de cada tema (de peor a mejor), cuántas preguntas hay en
 * cada caja Leitner y la evolución con el tiempo.
 *
 * La plantilla va dentro (`template`) en vez de en un `.html` aparte porque es muy corta.
 */
@Component({
  selector: 'app-progreso',
  template: `
    <div class="pagina">
      <h1 class="titulo-grande">Progreso</h1>
      <p class="mt-2 text-texto-2">Próximamente: acierto por tema y evolución.</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progreso {}
