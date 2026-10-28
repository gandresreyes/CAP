import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pregunta } from '../../shared/models/pregunta';
import { BancoPreguntas } from '../../shared/services/banco-preguntas';
import { ProgresoStore } from '../../shared/services/progreso-store';
import { Simulacros } from '../../shared/services/simulacros';
import {
  Correccion,
  corregir,
  crearSimulacro,
  DURACION_SIMULACRO,
  formatearNota,
  formatearTiempo,
  NOTA_APROBADO,
  PENALIZACION,
  PREGUNTAS_SIMULACRO,
} from '../../shared/utils/simulacro';

/** Letras de las opciones; en el simulacro salen en el orden original del examen. */
const LETRAS = ['A', 'B', 'C', 'D'];

/** Por debajo de este tiempo restante el reloj se pone en rojo (5 minutos). */
const AVISO_TIEMPO = 5 * 60 * 1000;

/** Corrección más los datos necesarios para revisar las preguntas en la pantalla de resultado. */
interface Resultado extends Correccion {
  preguntas: Pregunta[];
  respuestas: (number | null)[];
  /** Tiempo empleado en milisegundos. */
  duracion: number;
  /** `true` si se entregó solo al acabarse el tiempo. */
  porTiempo: boolean;
}

/**
 * Simulacro de examen (ruta `/simulacro`, a pantalla completa).
 *
 * Tiene tres fases, que se muestran según `fase()`:
 *
 * 1. **Intro**: explica las reglas y permite empezar (o continuar uno a medias).
 * 2. **Examen**: 100 preguntas con cuenta atrás de 2 horas. Como en papel, se puede
 *    dejar en blanco, cambiar respuestas y saltar entre preguntas con el índice.
 *    No hay corrección hasta entregar. Las opciones salen en el orden original
 *    del examen (sin barajar), como en el examen real.
 * 3. **Resultado**: nota (acierto +1, fallo −0,5, blanco 0), apto con 50 o más,
 *    acierto por tema y revisión de las falladas.
 *
 * El simulacro en curso se guarda tras cada respuesta (servicio `Simulacros`): si
 * se sale o se cierra la app, el reloj sigue corriendo y se puede continuar. Si el
 * tiempo se acaba con la app cerrada, al volver se corrige con lo respondido.
 *
 * Al entregar, las preguntas respondidas actualizan el progreso Leitner (las que
 * se dejan en blanco, no).
 */
@Component({
  selector: 'app-simulacro',
  imports: [RouterLink],
  templateUrl: './simulacro.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Simulacro {
  // ---------------------------------------------------------------------------
  // Servicios
  // ---------------------------------------------------------------------------

  protected readonly banco = inject(BancoPreguntas);
  private readonly progreso = inject(ProgresoStore);
  /** Simulacro en curso (guardado) e historial de resultados. */
  protected readonly simulacros = inject(Simulacros);

  // ---------------------------------------------------------------------------
  // Constantes para la plantilla
  // ---------------------------------------------------------------------------

  protected readonly letras = LETRAS;
  protected readonly reglas = {
    preguntas: PREGUNTAS_SIMULACRO,
    horas: DURACION_SIMULACRO / 3_600_000,
    penalizacion: formatearNota(PENALIZACION),
    aprobado: NOTA_APROBADO,
  };

  // ---------------------------------------------------------------------------
  // Reloj
  // ---------------------------------------------------------------------------

  /**
   * Hora actual, actualizada cada segundo. Es un signal para que todo lo que
   * depende del tiempo (la cuenta atrás) se repinte solo al cambiar.
   */
  private readonly ahora = signal(Date.now());

  constructor() {
    // Un "tic" por segundo mientras la pantalla esté abierta.
    const id = setInterval(() => this.tic(), 1000);
    // Al salir de la pantalla se para el temporizador (si no, seguiría
    // ejecutándose en segundo plano para siempre).
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  // ---------------------------------------------------------------------------
  // Estado de la pantalla
  // ---------------------------------------------------------------------------

  /** Si el usuario está dentro del examen (pulsó "Empezar" o "Continuar"). */
  private readonly abierto = signal(false);
  /** Corrección del simulacro recién entregado; mientras no se entrega, `null`. */
  protected readonly resultado = signal<Resultado | null>(null);
  /** Posición de la pregunta que se está viendo (0 a 99). */
  protected readonly indice = signal(0);
  /** Si está abierto el índice (cuadrícula para saltar entre preguntas). */
  protected readonly verIndice = signal(false);
  /** En el resultado, si se despliega la lista de preguntas falladas y en blanco. */
  protected readonly verFalladas = signal(false);

  // ---------------------------------------------------------------------------
  // Valores derivados
  // ---------------------------------------------------------------------------

  /** El simulacro guardado (en curso), o `null`. Atajo al del servicio. */
  protected readonly guardado = this.simulacros.enCurso;

  /**
   * Las preguntas del simulacro en curso, buscando cada id guardado en el banco.
   * `null` si no hay simulacro, si el banco aún no ha cargado o si alguna pregunta
   * ya no existe (no se podría corregir bien).
   */
  protected readonly preguntas = computed(() => {
    const s = this.guardado();
    const banco = this.banco.preguntas();
    if (!s || !banco.length) return null;
    const porId = new Map(banco.map((p) => [p.id, p]));
    const ps = s.ids.map((id) => porId.get(id));
    return ps.every((p) => p) ? (ps as Pregunta[]) : null;
  });

  /** Qué fase mostrar: el resultado si ya se entregó, el examen si está abierto, si no la intro. */
  protected readonly fase = computed(() => {
    if (this.resultado()) return 'resultado';
    if (this.abierto() && this.preguntas()) return 'examen';
    return 'intro';
  });

  /** Milisegundos que quedan del simulacro en curso (0 si no hay o se acabó). */
  protected readonly restante = computed(() => {
    const s = this.guardado();
    return s ? Math.max(0, s.fin - this.ahora()) : 0;
  });

  /** Tiempo restante como reloj ("1:59:07"), para la cabecera, la intro y el índice. */
  protected readonly restanteTexto = computed(() => formatearTiempo(this.restante()));

  /** Si quedan menos de 5 minutos (el reloj se pone en rojo). */
  protected readonly pocoTiempo = computed(() => this.restante() < AVISO_TIEMPO);

  /** La pregunta que se está viendo. */
  protected readonly actual = computed(() => this.preguntas()?.[this.indice()]);

  /** Opción marcada en la pregunta actual (0–3), o `null` si está en blanco. */
  protected readonly marcada = computed(() => this.guardado()?.respuestas[this.indice()] ?? null);

  /** Cuántas preguntas tienen respuesta (para el índice y la barra de avance). */
  protected readonly respondidas = computed(
    () => this.guardado()?.respuestas.filter((r) => r !== null).length ?? 0,
  );

  /** Total de preguntas del simulacro en curso. */
  protected readonly total = computed(() => this.guardado()?.ids.length ?? 0);

  /** Preguntas aún sin responder (en blanco), para el índice. */
  protected readonly enBlanco = computed(() => this.total() - this.respondidas());

  /** % de preguntas respondidas: ancho de la barra de avance de la cabecera. */
  protected readonly avance = computed(() => (this.total() ? (this.respondidas() / this.total()) * 100 : 0));

  /** Si se está en la última pregunta (el botón "Siguiente" pasa a ser "Entregar"). */
  protected readonly esUltima = computed(() => this.indice() === this.total() - 1);

  /**
   * Textos ya formateados del resultado: la nota ("62,5"), los puntos que restaron
   * los fallos y el tiempo empleado ("1:12:30"). `null` mientras no se ha entregado.
   */
  protected readonly textosResultado = computed(() => {
    const r = this.resultado();
    if (!r) return null;
    return {
      nota: formatearNota(r.nota),
      restados: formatearNota(r.fallos * PENALIZACION),
      duracion: formatearTiempo(r.duracion),
    };
  });

  /**
   * En el resultado: las preguntas falladas y en blanco, con lo que se respondió,
   * para revisarlas. `tuya` es el texto elegido (o `null` si quedó en blanco).
   */
  protected readonly falladas = computed(() => {
    const r = this.resultado();
    if (!r) return [];
    return r.preguntas.flatMap((p, i) => {
      const elegida = r.respuestas[i];
      if (elegida === p.correcta) return [];
      return [
        {
          pregunta: p,
          tuya: elegida === null ? null : p.opciones[elegida],
          correcta: p.opciones[p.correcta],
        },
      ];
    });
  });

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  /** Botón "Empezar simulacro": elige 100 preguntas y arranca el reloj. */
  protected empezar(): void {
    // Si había uno a medias, avisar antes de descartarlo.
    if (this.guardado() && !confirm('Se descartará el simulacro que tienes a medias. ¿Empezar uno nuevo?')) {
      return;
    }
    // Se pasa el progreso para que salgan primero las preguntas menos vistas.
    const ids = crearSimulacro(this.banco.preguntas(), this.progreso.progreso()).map((p) => p.id);
    this.simulacros.empezar(ids, Date.now());
    this.ahora.set(Date.now());
    this.indice.set(0);
    this.abierto.set(true);
  }

  /** Botón "Continuar": vuelve al simulacro a medias, en la primera pregunta sin responder. */
  protected continuar(): void {
    const primeraEnBlanco = this.guardado()?.respuestas.indexOf(null) ?? -1;
    this.indice.set(Math.max(0, primeraEnBlanco));
    this.abierto.set(true);
  }

  /** Botón "Abandonar": descarta el simulacro a medias sin guardar nota. */
  protected abandonar(): void {
    if (confirm('¿Abandonar el simulacro? No se guardará la nota.')) this.simulacros.abandonar();
  }

  /**
   * Marca una opción de la pregunta actual. Si ya estaba marcada, la desmarca y la
   * pregunta queda en blanco (útil para no arriesgar el −0,5).
   */
  protected marcar(opcion: number): void {
    this.simulacros.responder(this.indice(), this.marcada() === opcion ? null : opcion);
  }

  /** Va a otra pregunta (botones Anterior/Siguiente o una casilla del índice). */
  protected irA(i: number): void {
    this.indice.set(Math.min(Math.max(i, 0), this.total() - 1));
    this.verIndice.set(false);
    window.scrollTo({ top: 0 });
  }

  /** Botón "Entregar": pide confirmación (avisando de las que quedan en blanco) y corrige. */
  protected pedirEntrega(): void {
    const blancos = this.total() - this.respondidas();
    const aviso = blancos
      ? `Tienes ${blancos} preguntas en blanco. ¿Entregar el examen?`
      : '¿Entregar el examen?';
    if (confirm(aviso)) this.entregar(false);
  }

  /**
   * Cada segundo: actualiza el reloj y, si el tiempo se ha acabado, entrega solo.
   * También cubre el caso de volver a la app cuando el tiempo ya pasó.
   */
  private tic(): void {
    this.ahora.set(Date.now());
    const s = this.guardado();
    if (s && this.ahora() >= s.fin && this.preguntas()) this.entregar(true);
  }

  /**
   * Corrige el simulacro, actualiza el progreso, guarda el resultado en el
   * historial y muestra la pantalla de resultado.
   * @param porTiempo si se entrega solo porque se acabó el tiempo
   */
  private entregar(porTiempo: boolean): void {
    const s = this.guardado();
    const preguntas = this.preguntas();
    if (!s || !preguntas) return;

    const correccion = corregir(preguntas, s.respuestas);
    // Tiempo empleado: hasta ahora, o hasta el límite si se acabó.
    const duracion = Math.min(Date.now(), s.fin) - s.inicio;

    // Las respondidas cuentan para el repaso espaciado como cualquier respuesta.
    preguntas.forEach((p, i) => {
      const r = s.respuestas[i];
      if (r !== null) this.progreso.responder(p.id, r === p.correcta);
    });

    // Guardar en el historial y cerrar el simulacro en curso.
    this.simulacros.terminar({
      fecha: Date.now(),
      nota: correccion.nota,
      aprobado: correccion.aprobado,
      aciertos: correccion.aciertos,
      fallos: correccion.fallos,
      blancos: correccion.blancos,
      duracion,
    });

    this.resultado.set({ ...correccion, preguntas, respuestas: s.respuestas, duracion, porTiempo });
    this.abierto.set(false);
    this.verIndice.set(false);
    window.scrollTo({ top: 0 });
  }
}
