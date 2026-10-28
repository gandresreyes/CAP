import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BancoPreguntas } from '../../shared/services/banco-preguntas';
import { CopiaSeguridad } from '../../shared/services/copia-seguridad';
import { ProgresoStore } from '../../shared/services/progreso-store';
import { SesionesDiarias } from '../../shared/services/sesiones-diarias';
import { Simulacros } from '../../shared/services/simulacros';
import {
  aciertoGlobal,
  distribucionCajas,
  nivelAcierto,
  resumenPorTema,
} from '../../shared/utils/estadisticas';
import { formatearNota, NOTA_APROBADO } from '../../shared/utils/simulacro';
import { partirTema } from '../../shared/utils/temas';

/** Simulacros que se dibujan en la gráfica (los más recientes). */
const SIMULACROS_GRAFICA = 10;
/** Simulacros que se listan debajo de la gráfica, y con los que se calcula la media. */
const SIMULACROS_LISTA = 5;

/**
 * Pestaña "Progreso" (ruta `/progreso`): cómo vas en general.
 *
 * Bloques, de arriba abajo:
 * 1. Resumen: vistas, dominadas, racha y acierto global.
 * 2. Simulacros: gráfica de las últimas notas con la línea de aprobado y lista de resultados.
 * 3. Acierto por tema: los 14 temas de peor a mejor.
 * 4. Copia de seguridad: exportar e importar el progreso a un archivo.
 *
 * Todo se calcula al momento a partir de lo guardado (no hay datos propios de
 * esta pantalla), así que siempre está al día.
 */
@Component({
  selector: 'app-progreso',
  imports: [RouterLink],
  templateUrl: './progreso.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progreso {
  // ---------------------------------------------------------------------------
  // Servicios
  // ---------------------------------------------------------------------------

  private readonly banco = inject(BancoPreguntas);
  private readonly progreso = inject(ProgresoStore);
  protected readonly sesiones = inject(SesionesDiarias);
  private readonly simulacros = inject(Simulacros);
  private readonly copia = inject(CopiaSeguridad);

  protected readonly formatearNota = formatearNota;
  protected readonly notaAprobado = NOTA_APROBADO;

  // ---------------------------------------------------------------------------
  // 1. Resumen
  // ---------------------------------------------------------------------------

  /** Preguntas del banco. */
  protected readonly total = computed(() => this.banco.preguntas().length);

  /** [sin ver, caja 1, …, caja 5]: de aquí salen las vistas y las dominadas. */
  private readonly distribucion = computed(() =>
    distribucionCajas(this.banco.preguntas(), this.progreso.progreso()),
  );

  /** Preguntas respondidas al menos una vez (todas menos las "sin ver"). */
  protected readonly vistas = computed(() => this.total() - this.distribucion()[0]);

  /** Preguntas en caja 4 o 5 (acertadas varias veces seguidas). */
  protected readonly dominadas = computed(() => this.distribucion()[4] + this.distribucion()[5]);

  /** % de acierto de todas las respuestas, o `null` si aún no hay ninguna. */
  protected readonly acierto = computed(() =>
    aciertoGlobal(this.banco.preguntas(), this.progreso.progreso()),
  );

  // ---------------------------------------------------------------------------
  // 2. Simulacros
  // ---------------------------------------------------------------------------

  /** Si se ha hecho algún simulacro (si no, se muestra una invitación a hacer uno). */
  protected readonly haySimulacros = computed(() => this.simulacros.historial().length > 0);

  /**
   * Columnas de la gráfica: los últimos 10 simulacros, del más antiguo al más
   * reciente (de izquierda a derecha, como se lee el tiempo).
   * - `fecha`: no se muestra; solo identifica cada columna para el `track` del `@for`.
   * - `alto`: % de la altura de la gráfica (la nota sobre 100; las negativas se quedan en 0).
   * - `etiqueta`: texto para el lector de pantalla y para el aviso al mantener pulsado.
   */
  protected readonly columnas = computed(() =>
    this.simulacros
      .historial()
      .slice(-SIMULACROS_GRAFICA)
      .map((s) => ({
        fecha: s.fecha,
        alto: Math.min(Math.max(s.nota, 0), 100),
        aprobado: s.aprobado,
        etiqueta: `${formatearNota(s.nota)} puntos, ${s.aprobado ? 'apto' : 'no apto'}`,
      })),
  );

  /** Los últimos 5 resultados, del más reciente al más antiguo, para la lista. */
  protected readonly recientes = computed(() =>
    this.simulacros.historial().slice(-SIMULACROS_LISTA).reverse(),
  );

  /** Nota media de los últimos 5 simulacros (la tendencia reciente importa más que la de siempre). */
  protected readonly media = computed(() => {
    const r = this.recientes();
    return r.length ? r.reduce((suma, s) => suma + s.nota, 0) / r.length : 0;
  });

  // ---------------------------------------------------------------------------
  // 3. Acierto por tema
  // ---------------------------------------------------------------------------

  /**
   * Todos los temas con su resumen, de peor a mejor acierto. Los que aún no tienen
   * respuestas van al final (no se sabe si son flojos).
   */
  protected readonly temas = computed(() =>
    resumenPorTema(this.banco.preguntas(), this.progreso.progreso())
      .map((t) => ({
        ...t,
        ...partirTema(t.tema),
        nivel: t.porcentaje === null ? null : nivelAcierto(t.porcentaje),
      }))
      // Sin datos (null) se trata como 101 para que quede detrás de cualquier porcentaje.
      .sort((a, b) => (a.porcentaje ?? 101) - (b.porcentaje ?? 101)),
  );

  // ---------------------------------------------------------------------------
  // 4. Copia de seguridad
  // ---------------------------------------------------------------------------

  /** Mensaje de error al importar (archivo no válido), o `null`. */
  protected readonly errorImportar = signal<string | null>(null);

  /** Botón "Exportar": descarga el archivo con todo el progreso. */
  protected exportar(): void {
    this.copia.exportar();
  }

  /**
   * Al elegir un archivo en "Importar": lo lee, pide confirmación (se sustituye
   * todo el progreso actual) y, si va bien, recarga la app para que lea los datos nuevos.
   */
  protected async importar(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo si hace falta
    if (!archivo) return;

    if (!confirm('Se sustituirá todo tu progreso actual por el de la copia. ¿Continuar?')) return;

    const error = this.copia.importar(await archivo.text());
    this.errorImportar.set(error);
    if (!error) location.reload();
  }
}
