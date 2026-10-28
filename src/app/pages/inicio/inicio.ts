import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BancoPreguntas } from '../../shared/services/banco-preguntas';
import { ProgresoStore } from '../../shared/services/progreso-store';
import { Instalacion } from '../../shared/services/instalacion';
import { SesionEnCurso } from '../../shared/services/sesion-en-curso';
import { Simulacros } from '../../shared/services/simulacros';
import { formatearNota } from '../../shared/utils/simulacro';
import { MAX_SESIONES_DIA, SesionesDiarias } from '../../shared/services/sesiones-diarias';
import { aciertoPorTema, nivelAcierto } from '../../shared/utils/estadisticas';

/**
 * Formateador de la fecha de la cabecera, en español: "martes, 28 de octubre".
 * Se crea una vez fuera de la clase porque crear un `Intl.DateTimeFormat` es costoso.
 */
const FECHA = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * A partir de qué caja Leitner se considera que una pregunta está "dominada".
 * Llegar a la caja 4 exige haberla acertado al menos 3 veces seguidas sin fallar.
 */
const CAJA_DOMINADA = 4;

/**
 * Pantalla "Hoy" (ruta `/`): lo primero que se ve al abrir la app.
 *
 * Muestra el repaso diario (sesiones hechas de 3 y botón para empezar), tres datos
 * rápidos (racha, vistas y dominadas), el acceso al simulacro y los 3 temas con
 * peor acierto.
 *
 * Solo lee datos de los servicios y los resume; no modifica nada.
 */
@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  templateUrl: './inicio.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inicio {
  // ---------------------------------------------------------------------------
  // Servicios (instancias compartidas con el resto de la app)
  // ---------------------------------------------------------------------------

  private readonly banco = inject(BancoPreguntas);
  private readonly progreso = inject(ProgresoStore);
  /** Público para la plantilla: sesiones de hoy, las que quedan y la racha. */
  protected readonly sesiones = inject(SesionesDiarias);
  /** Sesión de repaso a medias, si la hay (para mostrar "Continuar sesión"). */
  private readonly enCurso = inject(SesionEnCurso);
  /** Simulacros: el que haya a medias y el historial de resultados. */
  private readonly simulacros = inject(Simulacros);
  /** Aviso "Instala la app" para iPhone (público para la plantilla). */
  protected readonly instalacion = inject(Instalacion);

  // ---------------------------------------------------------------------------
  // Datos fijos para la plantilla
  // ---------------------------------------------------------------------------

  /** Fecha de hoy ya formateada. Se calcula al abrir la pantalla. */
  protected readonly fecha = FECHA.format(new Date());
  protected readonly maxSesiones = MAX_SESIONES_DIA;
  /** `[0, 1, 2]`: uno por sesión diaria, para pintar los puntos con `@for`. */
  protected readonly puntos = Array.from({ length: MAX_SESIONES_DIA }, (_, i) => i);

  // ---------------------------------------------------------------------------
  // Estadísticas (computed: se recalculan solas cuando cambia el progreso o el banco)
  // ---------------------------------------------------------------------------

  /**
   * Estados Leitner de las preguntas respondidas que siguen existiendo en el banco.
   * Si en el futuro se borra una pregunta del JSON, su progreso antiguo no cuenta.
   * (`flatMap` con `[]` o `[x]` es una forma de filtrar y transformar a la vez).
   */
  private readonly estados = computed(() => {
    const prog = this.progreso.progreso();
    return this.banco.preguntas().flatMap((p) => (prog[p.id] ? [prog[p.id]] : []));
  });

  /**
   * Si hay una sesión de repaso a medias, por qué pregunta se iba (p. ej. 12 de 25);
   * si no, `null`. `Math.min` evita mostrar "26 de 25" cuando se estaba ya en el
   * repaso de fallos.
   */
  protected readonly aMedias = computed(() => {
    const g = this.enCurso.guardada();
    return g ? { pregunta: Math.min(g.indice + 1, g.sesion.length), total: g.sesion.length } : null;
  });

  /**
   * Texto de la tarjeta del simulacro, según el caso:
   * - hay uno a medias → avisar (el tiempo sigue corriendo);
   * - se ha hecho alguno → el último resultado ("Último: 62,5 puntos · Apto");
   * - nunca → las reglas básicas.
   */
  protected readonly textoSimulacro = computed(() => {
    if (this.simulacros.enCurso()) return 'Tienes uno a medias: el tiempo sigue corriendo.';
    const ultimo = this.simulacros.historial().at(-1);
    if (ultimo) {
      return `Último: ${formatearNota(ultimo.nota)} puntos · ${ultimo.aprobado ? 'Apto' : 'No apto'}`;
    }
    return '100 preguntas · 2 horas · los fallos restan 0,5';
  });

  /** Preguntas que hay en el banco (202 ahora mismo). */
  protected readonly total = computed(() => this.banco.preguntas().length);

  /** Preguntas respondidas al menos una vez. */
  protected readonly vistas = computed(() => this.estados().length);

  /** Preguntas en caja 4 o 5 (ver `CAJA_DOMINADA`). */
  protected readonly dominadas = computed(
    () => this.estados().filter((e) => e.caja >= CAJA_DOMINADA).length,
  );

  /** Preguntas vistas a las que les toca repaso hoy (su fecha `proximo` ya ha llegado). */
  protected readonly pendientes = computed(() => {
    const ahora = Date.now();
    return this.estados().filter((e) => e.proximo <= ahora).length;
  });

  /**
   * Los 3 temas con peor porcentaje de acierto, con un `nivel` para el color de la
   * barra (rojo por debajo del 50 %, azul hasta el 75 %, verde por encima; los
   * umbrales están en `nivelAcierto`, compartidos con la pantalla Temas).
   */
  protected readonly flojos = computed(() =>
    aciertoPorTema(this.banco.preguntas(), this.progreso.progreso())
      .slice(0, 3)
      .map((t) => ({ ...t, nivel: nivelAcierto(t.porcentaje) })),
  );
}
