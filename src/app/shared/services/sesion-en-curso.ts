import { Injectable, signal } from '@angular/core';
import { borrarJSON, guardarJSON, leerJSON } from '../utils/almacen';

/** Clave con la que se guarda la sesión a medias en `localStorage`. */
const KEY = 'cap-sesion-en-curso';

/**
 * Foto de una sesión de repaso a medias: lo justo para poder reconstruirla
 * exactamente igual si se cierra la app, se recarga la página o se sale con "Cerrar".
 *
 * Se guardan ids y no las preguntas enteras: las preguntas ya están en el banco,
 * y así lo guardado ocupa muy poco.
 */
export interface SesionGuardada {
  /** Ids de las 25 preguntas de la sesión, en el orden en que salen. */
  sesion: string[];
  /** Ids de las falladas pendientes de repetir en el "Repaso de fallos". */
  fallos: string[];
  /** Por qué pregunta se va (posición en sesión + fallos). Al retomar se sigue desde aquí. */
  indice: number;
  /** Acertadas a la primera hasta ahora (la nota parcial). */
  aciertos: number;
  /** Ids que ya cambiaron de caja Leitner en esta sesión (para no contarlas dos veces). */
  puntuadas: string[];
}

/**
 * Guarda la sesión de repaso que está a medias, para poder retomarla.
 *
 * - La pantalla de repaso llama a `guardar` después de cada respuesta.
 * - Al terminar la sesión, o al elegir "Empezar una nueva", se llama a `borrar`.
 * - Si al entrar al repaso hay una guardada, se ofrece retomarla.
 *
 * Es un único objeto para toda la app (`providedIn: 'root'`), así que Inicio
 * también puede saber si hay una sesión a medias y mostrar "Continuar sesión".
 */
@Injectable({ providedIn: 'root' })
export class SesionEnCurso {
  /**
   * La sesión guardada, o `null` si no hay ninguna a medias (o el dato guardado está
   * corrupto). Privado: solo se cambia con los métodos.
   */
  private readonly estado = signal<SesionGuardada | null>(leerJSON<SesionGuardada | null>(KEY, null));

  /** Versión de solo lectura para el resto de la app. */
  readonly guardada = this.estado.asReadonly();

  /** Guarda (o sobrescribe) la sesión a medias, en memoria y en el navegador. */
  guardar(s: SesionGuardada): void {
    this.estado.set(s);
    guardarJSON(KEY, s);
  }

  /** Olvida la sesión a medias (terminada o descartada). */
  borrar(): void {
    this.estado.set(null);
    borrarJSON(KEY);
  }
}
