import { barajar } from './barajar';

/**
 * Decide en qué orden se muestran las 4 opciones de una pregunta.
 *
 * Normalmente se barajan, para que el usuario aprenda la respuesta y no su posición
 * ("la de este tema siempre es la C").
 *
 * Excepción: algunas opciones citan a otras por su letra o posición, por ejemplo
 * "Las respuestas B y C son correctas" o "Todas las respuestas anteriores son
 * correctas". Si se barajaran, la B ya no sería la B y la opción dejaría de tener
 * sentido. En esos casos se mantiene el orden original del examen.
 *
 * En el banco actual pasa en 23 de las 202 preguntas.
 */
export function ordenarOpciones(opciones: readonly string[]): string[] {
  // Todas esas opciones contienen la palabra "respuesta" o "respuestas"
  // (`\b` = límite de palabra, `s?` = la "s" es opcional, `i` = sin distinguir mayúsculas).
  const citaAOtras = opciones.some((o) => /\brespuestas?\b/i.test(o));

  // Se devuelve siempre un array nuevo, también cuando no se baraja, para que
  // quien lo reciba nunca modifique sin querer el de la pregunta original.
  return citaAOtras ? [...opciones] : barajar(opciones);
}
