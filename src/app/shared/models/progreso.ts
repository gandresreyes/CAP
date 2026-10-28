/**
 * Lo que la app sabe de una pregunta para el repaso espaciado (sistema Leitner,
 * explicado en `utils/leitner.ts`).
 *
 * Solo existe para las preguntas ya respondidas al menos una vez: si una pregunta
 * no tiene `Estado`, es que nunca se ha visto.
 */
export interface Estado {
  /** Caja de 1 a 5. Cuanto más alta, mejor se sabe y más días tarda en volver a salir. */
  caja: number;
  /** Cuándo vuelve a tocar: la medianoche (hora local) de ese día, en milisegundos. */
  proximo: number;
  /** Veces acertada en total (histórico, no se reinicia). */
  aciertos: number;
  /** Veces fallada en total (histórico, no se reinicia). */
  fallos: number;
}

/**
 * Todo el progreso del usuario: un `Estado` por cada pregunta respondida,
 * indexado por el id de la pregunta.
 *
 * Se guarda en `localStorage` (clave `cap-progreso`), es decir, solo en este
 * navegador y en este dispositivo.
 *
 * @example { "cyl-2026-10-007": { caja: 2, proximo: 1761775200000, aciertos: 1, fallos: 0 } }
 */
export type Progreso = Record<string, Estado>;
