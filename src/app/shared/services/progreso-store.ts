import { Injectable, signal } from '@angular/core';
import { Estado, Progreso } from '../models/progreso';
import { siguienteEstado } from '../utils/leitner';

/** Clave con la que se guarda el progreso en `localStorage`. No cambiarla: se perdería todo. */
const KEY = 'cap-progreso';

/**
 * Lee el progreso guardado en el navegador.
 *
 * Si no hay nada (primera visita) se empieza con `{}`. Si el dato está corrupto
 * (alguien lo editó a mano, o se cortó a medias), `JSON.parse` lanza un error:
 * en ese caso también se empieza de cero en vez de romper la app.
 */
function leer(): Progreso {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Guarda y comparte el progreso del usuario: en qué caja Leitner está cada pregunta.
 *
 * El progreso vive en memoria como un signal (para que las pantallas se actualicen
 * solas al cambiar) y se copia a `localStorage` cada vez que cambia (para que no
 * se pierda al cerrar la app).
 *
 * Es un único objeto para toda la app (`providedIn: 'root'`): Inicio y Repaso
 * leen el mismo progreso, así que al volver de un repaso Inicio ya muestra los datos nuevos.
 */
@Injectable({ providedIn: 'root' })
export class ProgresoStore {
  /** El progreso real. Privado: solo este servicio puede modificarlo. */
  private readonly estado = signal<Progreso>(leer());

  /**
   * Versión de solo lectura para el resto de la app. Quien la usa puede leerla
   * (`progreso()`) pero no cambiarla: los cambios pasan siempre por `responder`,
   * que es quien sabe aplicar las reglas de Leitner y guardar.
   */
  readonly progreso = this.estado.asReadonly();

  /**
   * Registra una respuesta: calcula el nuevo estado de la pregunta (sube o baja de
   * caja), lo guarda y lo devuelve (la pantalla lo usa para decir cuándo volverá a salir).
   *
   * @param id id de la pregunta respondida
   * @param acierto si la respuesta fue correcta
   */
  responder(id: string, acierto: boolean): Estado {
    // Calcular el nuevo estado a partir del anterior (o de cero si es nueva).
    const e = siguienteEstado(this.estado()[id], acierto, Date.now());

    // Crear un objeto nuevo en vez de modificar el existente: los signals detectan
    // cambios comparando referencias, así que si se mutara el mismo objeto,
    // las pantallas no se enterarían del cambio.
    this.estado.update((p) => ({ ...p, [id]: e }));

    // Copiar a localStorage para que sobreviva al cerrar la app.
    localStorage.setItem(KEY, JSON.stringify(this.estado()));
    return e;
  }
}
