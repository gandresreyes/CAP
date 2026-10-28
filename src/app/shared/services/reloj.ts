import { Injectable, signal } from '@angular/core';
import { inicioDelDia } from '../utils/leitner';

/** Cada cuánto se comprueba si ha cambiado el día con la app abierta (1 minuto). */
const INTERVALO_COMPROBACION = 60_000;

/**
 * Sabe qué día es hoy y avisa cuando cambia.
 *
 * Por qué hace falta: un `computed` solo se recalcula cuando cambia algún signal que
 * lee, y la hora (`Date.now()`) no es un signal. Si una pantalla calcula "sesiones de
 * hoy" con `Date.now()`, el resultado se queda guardado y no se entera de que ha
 * llegado la medianoche. En iPhone la PWA vuelve del segundo plano sin recargarse,
 * así que por la mañana seguiría mostrando los datos de ayer (por ejemplo, "Hecho por
 * hoy" y el repaso bloqueado).
 *
 * Solución: `hoy` es un signal con la medianoche del día actual. Se actualiza:
 * - al volver la app a primer plano (`visibilitychange`), que es el caso del móvil;
 * - y una vez por minuto, por si la app sigue abierta en pantalla al cambiar el día.
 * Todo lo que dependa del día (sesiones de hoy, racha, pendientes, fecha) lee `hoy()`
 * y se recalcula solo cuando cambia de verdad.
 *
 * Es un único objeto para toda la app (`providedIn: 'root'`) que vive mientras la app
 * está abierta, por eso no hace falta parar el temporizador ni quitar el listener.
 */
@Injectable({ providedIn: 'root' })
export class Reloj {
  /** Medianoche (hora local) del día actual, en milisegundos. Privado: solo lo cambia `actualizar`. */
  private readonly hoyS = signal(inicioDelDia(Date.now()));

  /** Medianoche de hoy, de solo lectura. Cambia exactamente una vez al día. */
  readonly hoy = this.hoyS.asReadonly();

  constructor() {
    // Al volver a la app (desbloquear el móvil, cambiar de otra app…).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.actualizar();
    });
    // Por si la app sigue en pantalla justo cuando pasa la medianoche.
    setInterval(() => this.actualizar(), INTERVALO_COMPROBACION);
  }

  /**
   * Comprueba la fecha real y, si ha cambiado el día, actualiza `hoy` (y con él todo
   * lo que dependa del día). Devuelve la medianoche de hoy ya comprobada, para usarla
   * justo antes de guardar algo que dependa de la fecha.
   */
  actualizar(): number {
    const hoy = inicioDelDia(Date.now());
    // Solo se cambia si es otro día: así no se recalcula nada sin necesidad.
    if (hoy !== this.hoyS()) this.hoyS.set(hoy);
    return hoy;
  }
}
