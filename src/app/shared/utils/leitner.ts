import { Estado } from '../models/progreso';

/*
 * Sistema Leitner (repaso espaciado)
 * ----------------------------------
 * Cada pregunta está en una de 5 "cajas". Cuanto más alta la caja, mejor se sabe
 * y más días pasan hasta que vuelve a salir:
 *
 *   caja 1 → 1 día · caja 2 → 3 días · caja 3 → 6 · caja 4 → 10 · caja 5 → 15
 *
 * El máximo es 15 días (no 30) porque el examen está cerca: así ninguna pregunta
 * pasa más de dos semanas sin repasarse.
 *
 * - Acertar sube la pregunta una caja (como máximo hasta la 5).
 * - Fallar la devuelve a la caja 1, sea cual sea la caja en la que estaba.
 *
 * Así se repasa mucho lo que cuesta y poco lo que ya se sabe.
 */

/** Caja más alta posible. */
export const CAJA_MAX = 5;

/**
 * Días de espera según la caja: `INTERVALOS[caja]`.
 * La posición 0 no se usa (no existe la caja 0); está para que el índice coincida
 * con el número de caja y no haya que restar 1.
 */
export const INTERVALOS = [0, 1, 3, 6, 10, 15];

/**
 * Devuelve la medianoche (00:00 hora local) del día de `ahora`, desplazada `dias` días.
 *
 * Se usa para contar por días naturales del calendario, no por bloques de 24 horas:
 * si fallas una pregunta a las 20:00, "mañana" debe ser mañana desde las 00:00,
 * no a partir de las 20:00 del día siguiente.
 *
 * @param ahora instante de referencia en milisegundos (p. ej. `Date.now()`)
 * @param dias días a sumar; puede ser negativo (`-1` = ayer)
 * @returns milisegundos de esa medianoche
 */
export function inicioDelDia(ahora: number, dias = 0): number {
  const d = new Date(ahora);
  d.setHours(0, 0, 0, 0); // a las 00:00:00.000 del mismo día
  // `setDate` gestiona solo los cambios de mes/año y el horario de verano
  // (sumar 24 h a mano fallaría los días que tienen 23 o 25 horas).
  d.setDate(d.getDate() + dias);
  return d.getTime();
}

/**
 * Calcula cómo queda una pregunta después de responderla.
 *
 * Es una función pura: no lee ni guarda nada, solo recibe datos y devuelve el
 * resultado. Guardarlo es trabajo del servicio `ProgresoStore`.
 *
 * @param previo estado anterior, o `undefined` si es la primera vez que se responde
 * @param acierto si la respuesta fue correcta
 * @param ahora momento de la respuesta (se pasa como parámetro para poder probarla con cualquier fecha)
 */
export function siguienteEstado(previo: Estado | undefined, acierto: boolean, ahora: number): Estado {
  // Primera vez: se parte de la caja 1 sin aciertos ni fallos.
  const e = previo ?? { caja: 1, proximo: 0, aciertos: 0, fallos: 0 };

  // Acierto: sube una caja sin pasar de la 5. Fallo: vuelta a la caja 1.
  const caja = acierto ? Math.min(e.caja + 1, CAJA_MAX) : 1;

  return {
    caja,
    // Cuándo vuelve a salir: la medianoche de dentro de N días, según la caja nueva.
    proximo: inicioDelDia(ahora, INTERVALOS[caja]),
    // Contadores históricos (se usan para el % de acierto por tema).
    aciertos: e.aciertos + (acierto ? 1 : 0),
    fallos: e.fallos + (acierto ? 0 : 1),
  };
}
