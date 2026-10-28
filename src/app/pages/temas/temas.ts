import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MODULOS } from '../../shared/models/temas';
import { BancoPreguntas } from '../../shared/services/banco-preguntas';
import { ProgresoStore } from '../../shared/services/progreso-store';
import { nivelAcierto, resumenPorTema } from '../../shared/utils/estadisticas';
import { partirTema } from '../../shared/utils/temas';

/**
 * Pestaña "Temas" (ruta `/temas`): práctica libre por tema.
 *
 * Muestra los 14 temas agrupados por módulo, como en el índice del libro, con
 * cuántas preguntas has visto de cada uno y tu % de acierto. Al tocar un tema se
 * abre la pantalla de repaso en modo práctica, solo con preguntas de ese tema
 * (`/repaso?tema=…`).
 *
 * La práctica es ilimitada (no cuenta para las 3 sesiones diarias), pero lo que
 * se responde sí actualiza el progreso.
 */
@Component({
  selector: 'app-temas',
  imports: [RouterLink],
  templateUrl: './temas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Temas {
  // ---------------------------------------------------------------------------
  // Servicios
  // ---------------------------------------------------------------------------

  private readonly banco = inject(BancoPreguntas);
  private readonly progreso = inject(ProgresoStore);

  // ---------------------------------------------------------------------------
  // Datos para la plantilla
  // ---------------------------------------------------------------------------

  /**
   * Los módulos con sus temas, listos para pintar.
   *
   * Para cada tema del temario (`MODULOS`) junta:
   * - su número y título por separado (`partirTema`), para darles estilos distintos;
   * - su resumen (preguntas, vistas, % de acierto) calculado a partir del progreso;
   * - el nivel de acierto para el color (rojo / azul / verde), o `null` si aún no
   *   hay respuestas.
   *
   * Los temas sin preguntas en el banco no se muestran (no habría nada que practicar).
   * Al ser `computed`, se recalcula solo cuando cambia el progreso: al volver de
   * una práctica, los porcentajes ya están actualizados.
   */
  protected readonly modulos = computed(() => {
    // Índice tema → resumen, para buscar el de cada tema al instante.
    const resumen = new Map(
      resumenPorTema(this.banco.preguntas(), this.progreso.progreso()).map((r) => [r.tema, r]),
    );

    return MODULOS.map((m) => ({
      nombre: m.nombre,
      temas: m.temas.flatMap((tema) => {
        const r = resumen.get(tema);
        if (!r) return []; // sin preguntas en el banco: se omite
        return [
          {
            ...r,
            ...partirTema(tema),
            nivel: r.porcentaje === null ? null : nivelAcierto(r.porcentaje),
          },
        ];
      }),
    }));
  });
}
