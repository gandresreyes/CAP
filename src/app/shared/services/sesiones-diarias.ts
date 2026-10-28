import { computed, inject, Injectable, signal } from '@angular/core';
import { alCambiarEnOtraPestana, guardarJSON, leerJSON } from '../utils/almacen';
import { calcularRacha } from '../utils/estadisticas';
import { Reloj } from './reloj';

/** Clave con la que se guarda el registro de sesiones en `localStorage`. */
const KEY = 'cap-sesiones';

/**
 * Cuántos días se recuerdan para calcular la racha (más de un año).
 * Sirve para que la lista no crezca sin límite con los años.
 */
const DIAS_GUARDADOS = 400;

/** Sesiones de repaso permitidas al día, como las lecciones diarias de Duolingo. */
export const MAX_SESIONES_DIA = 3;

/** Lo que se guarda en `localStorage`. */
interface Registro {
  /** Día al que se refiere `hechas` (su medianoche en milisegundos). */
  dia: number;
  /** Sesiones terminadas ese día. */
  hechas: number;
  /** Medianoches de todos los días con al menos una sesión terminada (para la racha). */
  dias: number[];
}

/**
 * Lee el registro guardado.
 *
 * Se mezcla con valores por defecto (`{ dia: 0, hechas: 0, dias: [], ...guardado }`)
 * para que, si falta algún campo (p. ej. un registro de una versión anterior de la
 * app que aún no guardaba `dias`), tome su valor por defecto en vez de `undefined`.
 */
function leer(): Registro {
  return { dia: 0, hechas: 0, dias: [], ...leerJSON<Partial<Registro>>(KEY, {}) };
}

/**
 * Lleva la cuenta de las sesiones de repaso de cada día (máximo 3) y de la racha.
 *
 * - Una sesión cuenta cuando se termina; una a medias no cuenta.
 * - Al cambiar de día, el contador vuelve solo a 0: no hace falta reiniciarlo,
 *   porque `hechasHoy` compara el día guardado con el de hoy.
 * - "Hoy" sale del servicio `Reloj` (un signal), no de `Date.now()`: así los valores
 *   se recalculan al pasar la medianoche aunque la app siga abierta en segundo plano.
 */
@Injectable({ providedIn: 'root' })
export class SesionesDiarias {
  /** Fecha de hoy como signal: cuando cambia el día, todo lo que depende de ella se recalcula. */
  private readonly reloj = inject(Reloj);

  /** El registro en memoria, como signal para que la pantalla se actualice al cambiar. */
  private readonly registro = signal<Registro>(leer());

  constructor() {
    // Si otra pestaña termina una sesión, se recarga aquí para no pisar su cuenta.
    alCambiarEnOtraPestana(KEY, () => this.registro.set(leer()));
  }

  /**
   * Sesiones terminadas hoy. Si lo guardado es de otro día, hoy aún no hay ninguna.
   *
   * `computed` crea un valor derivado: se recalcula solo cuando cambia algún signal
   * que lee (aquí, `registro` y `reloj.hoy`), y mientras no cambie devuelve el último
   * resultado sin volver a calcularlo.
   */
  readonly hechasHoy = computed(() => {
    const r = this.registro();
    return r.dia === this.reloj.hoy() ? r.hechas : 0;
  });

  /** Sesiones que aún se pueden hacer hoy (de 0 a 3). Nunca negativo. */
  readonly quedan = computed(() => Math.max(0, MAX_SESIONES_DIA - this.hechasHoy()));

  /** Días seguidos con al menos una sesión terminada (ver `calcularRacha`). */
  readonly racha = computed(() => calcularRacha(this.registro().dias, this.reloj.hoy()));

  /** Apunta una sesión terminada hoy. La llama la pantalla de repaso al acabar la última pregunta. */
  registrar(): void {
    // Fecha comprobada en este momento (no la del último aviso del reloj), porque lo
    // que se guarda depende de ella.
    const hoy = this.reloj.actualizar();
    const actual = this.registro();

    // Si lo guardado es de hoy, se suma una; si es de otro día, esta es la primera de hoy.
    // (Se calcula aquí y no con `hechasHoy()` para no arrastrar nunca el número de ayer.)
    const hechas = actual.dia === hoy ? actual.hechas + 1 : 1;

    // Añadir hoy a la lista de días con sesión: primero se quita (por si ya estaba,
    // para no duplicarlo) y luego se añade al final. `slice(-N)` se queda con los
    // N más recientes y descarta los más antiguos.
    const dias = actual.dias.filter((d) => d !== hoy);
    const r = { dia: hoy, hechas, dias: [...dias, hoy].slice(-DIAS_GUARDADOS) };

    // Actualizar en memoria (la pantalla se entera) y guardar en el navegador.
    this.registro.set(r);
    guardarJSON(KEY, r);
  }
}
