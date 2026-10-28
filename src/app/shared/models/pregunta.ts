/**
 * Una pregunta del banco, tal como viene en `public/data/questions.json`.
 *
 * Es un dato estático: la app nunca la modifica, solo la lee. Para añadir o
 * corregir preguntas se edita el JSON y se vuelve a publicar la app.
 */
export interface Pregunta {
  /**
   * Identificador único y permanente, p. ej. `cyl-2026-10-007`
   * (comunidad, convocatoria y número de la pregunta en el modelo A).
   * El progreso del usuario se guarda por este id: si cambiara, se perdería
   * el progreso de esa pregunta. Nunca cambiarlo ni reutilizarlo.
   */
  id: string;
  /** Uno de los 14 temas del temario (lista en CLAUDE.md), p. ej. "1.3 Consumo de carburante". */
  tema: string;
  /** El texto de la pregunta. */
  enunciado: string;
  /** Las 4 respuestas posibles, en el orden del examen original (A, B, C, D). */
  opciones: string[];
  /** Posición de la respuesta correcta en `opciones`: 0 = A, 1 = B, 2 = C, 3 = D. */
  correcta: number;
  /** Explicación que se muestra tras responder ("Por qué"). Puede ir vacía: entonces no se muestra. */
  explicacion: string;
  /** Ruta opcional de una imagen (en `public/data/img/`) para preguntas con señales o esquemas. */
  imagen?: string;
  /** De qué examen sale, p. ej. "CyL 2026-10" (Castilla y León, octubre de 2026). */
  origen?: string;
}
