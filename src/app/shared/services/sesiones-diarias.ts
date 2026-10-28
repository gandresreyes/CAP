import { computed, Injectable, signal } from '@angular/core';
import { calcularRacha } from '../utils/estadisticas';
import { inicioDelDia } from '../utils/leitner';

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
  try {
    return { dia: 0, hechas: 0, dias: [], ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { dia: 0, hechas: 0, dias: [] };
  }
}

/**
 * Lleva la cuenta de las sesiones de repaso de cada día (máximo 3) y de la racha.
 *
 * - Una sesión cuenta cuando se termina; una a medias no cuenta.
 * - Al cambiar de día, el contador vuelve solo a 0: no hace falta reiniciarlo,
 *   porque `hechasHoy` compara el día guardado con el de hoy.
 */
@Injectable({ providedIn: 'root' })
export class SesionesDiarias {
  /** El registro en memoria, como signal para que la pantalla se actualice al cambiar. */
  private readonly registro = signal<Registro>(leer());

  /**
   * Sesiones terminadas hoy. Si lo guardado es de otro día, hoy aún no hay ninguna.
   *
   * `computed` crea un valor derivado: se recalcula solo cuando cambia algún signal
   * que lee (aquí, `registro`), y mientras no cambie devuelve el último resultado
   * sin volver a calcularlo.
   */
  readonly hechasHoy = computed(() => {
    const r = this.registro();
    return r.dia === inicioDelDia(Date.now()) ? r.hechas : 0;
  });

  /** Sesiones que aún se pueden hacer hoy (de 0 a 3). Nunca negativo. */
  readonly quedan = computed(() => Math.max(0, MAX_SESIONES_DIA - this.hechasHoy()));

  /** Días seguidos con al menos una sesión terminada (ver `calcularRacha`). */
  readonly racha = computed(() => calcularRacha(this.registro().dias, inicioDelDia(Date.now())));

  /** Apunta una sesión terminada hoy. La llama la pantalla de repaso al acabar la última pregunta. */
  registrar(): void {
    const hoy = inicioDelDia(Date.now());

    // Añadir hoy a la lista de días con sesión: primero se quita (por si ya estaba,
    // para no duplicarlo) y luego se añade al final. `slice(-N)` se queda con los
    // N más recientes y descarta los más antiguos.
    const dias = this.registro().dias.filter((d) => d !== hoy);
    const r = { dia: hoy, hechas: this.hechasHoy() + 1, dias: [...dias, hoy].slice(-DIAS_GUARDADOS) };

    // Actualizar en memoria (la pantalla se entera) y guardar en el navegador.
    this.registro.set(r);
    localStorage.setItem(KEY, JSON.stringify(r));
  }
}
