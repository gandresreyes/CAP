import { Injectable, signal } from '@angular/core';
import { borrarJSON, guardarJSON, leerJSON } from '../utils/almacen';
import { DURACION_SIMULACRO } from '../utils/simulacro';

/** Clave del simulacro en curso en `localStorage`. */
const KEY_EN_CURSO = 'cap-simulacro';
/** Clave del historial de resultados en `localStorage`. */
const KEY_HISTORIAL = 'cap-simulacros';
/** Resultados que se recuerdan (los más recientes). */
const MAX_HISTORIAL = 50;

/**
 * Un simulacro empezado y aún sin entregar.
 *
 * Se guarda en el navegador tras cada respuesta, así que si se cierra la app se
 * puede continuar. El tiempo se guarda como hora de fin (`fin`), no como "tiempo
 * restante": así el reloj sigue corriendo aunque la app esté cerrada, igual que
 * en el examen real.
 */
export interface SimulacroGuardado {
  /** Ids de las 100 preguntas, en el orden en que salen. */
  ids: string[];
  /** Para cada pregunta, índice de la opción elegida (0 = A … 3 = D) o `null` si está en blanco. */
  respuestas: (number | null)[];
  /** Cuándo se empezó (milisegundos). */
  inicio: number;
  /** Cuándo se acaba el tiempo (inicio + 2 horas). */
  fin: number;
}

/** Resultado de un simulacro entregado, para el historial (pestaña Progreso e Inicio). */
export interface ResultadoSimulacro {
  fecha: number;
  nota: number;
  aprobado: boolean;
  aciertos: number;
  fallos: number;
  blancos: number;
  /** Tiempo empleado en milisegundos. */
  duracion: number;
}

/**
 * Guarda el simulacro en curso y el historial de resultados.
 *
 * Es un único objeto para toda la app (`providedIn: 'root'`): la pantalla del
 * simulacro lo usa para examinar e Inicio para mostrar el último resultado o
 * avisar de que hay uno a medias.
 */
@Injectable({ providedIn: 'root' })
export class Simulacros {
  /** El simulacro en curso, o `null` si no hay ninguno. Privado: solo se cambia con los métodos. */
  private readonly enCursoS = signal<SimulacroGuardado | null>(leerJSON<SimulacroGuardado | null>(KEY_EN_CURSO, null));
  /** Versión de solo lectura para el resto de la app. */
  readonly enCurso = this.enCursoS.asReadonly();

  /** Resultados anteriores, del más antiguo al más reciente. */
  private readonly historialS = signal<ResultadoSimulacro[]>(leerJSON<ResultadoSimulacro[]>(KEY_HISTORIAL, []));
  readonly historial = this.historialS.asReadonly();

  /**
   * Empieza un simulacro nuevo (sustituye al que hubiera a medias).
   * @param ids ids de las preguntas elegidas, en orden
   * @param ahora momento de inicio (`Date.now()`)
   */
  empezar(ids: string[], ahora: number): void {
    this.guardarEnCurso({
      ids,
      respuestas: ids.map(() => null), // todas en blanco al principio
      inicio: ahora,
      fin: ahora + DURACION_SIMULACRO,
    });
  }

  /**
   * Apunta la respuesta de una pregunta.
   * @param i posición de la pregunta en el simulacro
   * @param opcion índice de la opción elegida, o `null` para dejarla en blanco
   */
  responder(i: number, opcion: number | null): void {
    const s = this.enCursoS();
    if (!s) return;
    // Copia de la lista con el cambio (los signals necesitan un objeto nuevo para enterarse).
    const respuestas = [...s.respuestas];
    respuestas[i] = opcion;
    this.guardarEnCurso({ ...s, respuestas });
  }

  /** Cierra el simulacro en curso y guarda su resultado en el historial. */
  terminar(resultado: ResultadoSimulacro): void {
    const historial = [...this.historialS(), resultado].slice(-MAX_HISTORIAL);
    this.historialS.set(historial);
    guardarJSON(KEY_HISTORIAL, historial);
    this.abandonar();
  }

  /** Descarta el simulacro en curso sin guardar resultado. */
  abandonar(): void {
    this.enCursoS.set(null);
    borrarJSON(KEY_EN_CURSO);
  }

  /** Actualiza el simulacro en curso en memoria y en el navegador. */
  private guardarEnCurso(s: SimulacroGuardado): void {
    this.enCursoS.set(s);
    guardarJSON(KEY_EN_CURSO, s);
  }
}
