import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BancoPreguntas } from '../../shared/services/banco-preguntas';
import { MAX_SESIONES_DIA } from '../../shared/services/sesiones-diarias';
import { CAJA_DOMINADA } from '../../shared/utils/estadisticas';
import { INTERVALOS } from '../../shared/utils/leitner';
import { NOTA_APROBADO, PREGUNTAS_SIMULACRO } from '../../shared/utils/simulacro';

/**
 * Pantalla "Acerca de" (ruta `/acerca-de`, a pantalla completa, sin barra inferior).
 *
 * Reúne los avisos de la app: privacidad (todo se guarda en el móvil), que no es
 * una app oficial y de dónde salen las preguntas (con la advertencia de que puede
 * haber errores). También explica en pocas líneas cómo funcionan el repaso diario,
 * las "dominadas" y el simulacro, para quien no lo tenga claro.
 *
 * Se llega desde el pie de Inicio. Solo lee datos; no modifica nada.
 */
@Component({
  selector: 'app-acerca-de',
  imports: [RouterLink],
  templateUrl: './acerca-de.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcercaDe {
  private readonly banco = inject(BancoPreguntas);

  /** Constantes de las reglas, para que el texto no se quede viejo si cambian. */
  protected readonly reglas = {
    sesionesDia: MAX_SESIONES_DIA,
    /** Días de espera más corto y más largo del repaso espaciado (1 y 15). */
    diasMin: INTERVALOS[1],
    diasMax: INTERVALOS.at(-1),
    /** Aciertos seguidos para llegar a la caja de "dominada": se empieza en la 1 y cada uno sube una. */
    aciertosDominada: CAJA_DOMINADA - 1,
    preguntasSimulacro: PREGUNTAS_SIMULACRO,
    aprobado: NOTA_APROBADO,
  };

  /** Preguntas que hay en el banco. */
  protected readonly total = computed(() => this.banco.preguntas().length);

  /**
   * Convocatorias de las que salen las preguntas ("CyL 2026-01", "CyL 2026-10"…),
   * sacadas del campo `origen` del JSON, sin repetir y en orden. Así la lista se
   * actualiza sola al añadir exámenes nuevos.
   */
  protected readonly convocatorias = computed(() =>
    [...new Set(this.banco.preguntas().flatMap((p) => (p.origen ? [p.origen] : [])))].sort(),
  );
}
