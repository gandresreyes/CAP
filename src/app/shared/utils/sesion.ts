import { Pregunta } from '../models/pregunta';
import { Progreso } from '../models/progreso';
import { barajar } from './barajar';

/**
 * Agrupa las preguntas por tema.
 *
 * Devuelve un `Map` cuya clave es el nombre del tema y cuyo valor es la lista de
 * preguntas de ese tema. Las preguntas se barajan antes de agrupar, así cada
 * lista sale ya en orden aleatorio y quien la use puede coger las primeras.
 *
 * @example
 * porTema(banco) // → Map { "1.1 Cadena cinemática" => [p7, p31, …], "2.1 …" => […] }
 */
export function porTema(preguntas: readonly Pregunta[]): Map<string, Pregunta[]> {
  const grupos = new Map<string, Pregunta[]>();
  for (const p of barajar(preguntas)) {
    // Si es la primera pregunta de su tema, se crea la lista vacía.
    if (!grupos.has(p.tema)) grupos.set(p.tema, []);
    // El `!` le dice a TypeScript que la lista existe (la acabamos de crear arriba).
    grupos.get(p.tema)!.push(p);
  }
  return grupos;
}

/**
 * Elige `n` preguntas repartiéndolas entre los temas por turnos.
 *
 * Funciona como repartir cartas: una pregunta del tema 1, una del tema 2, una del
 * tema 3… y vuelta a empezar. Así, aunque un tema tenga muchas más preguntas que
 * otro (Consumo tiene 35 y Imagen de marca 3), la sesión sale variada.
 *
 * Si un tema se queda sin preguntas, se salta y se sigue con los demás.
 */
export function porTurnos(preguntas: readonly Pregunta[], n: number): Pregunta[] {
  // Una "cola" de preguntas por tema, cada una ya barajada.
  const colas = [...porTema(preguntas).values()];
  const salida: Pregunta[] = [];

  // Repetir vueltas mientras falten preguntas y quede alguna en alguna cola.
  while (salida.length < n && colas.some((c) => c.length)) {
    // Una vuelta: coger la primera pregunta de cada tema que aún tenga.
    // `shift()` la saca de la cola para no repetirla en la vuelta siguiente.
    for (const c of colas) {
      if (c.length && salida.length < n) salida.push(c.shift()!);
    }
  }
  return salida;
}

/**
 * Toma hasta `n` preguntas, en el orden recibido, sin pasar de `max` preguntas
 * del mismo tema.
 *
 * Sirve para el repaso: si un día tienes 20 pendientes y 15 son del mismo tema,
 * no quieres una sesión casi monotemática. Las que se saltan no se pierden:
 * siguen pendientes y saldrán en otra sesión.
 */
function conTopePorTema(preguntas: readonly Pregunta[], n: number, max: number): Pregunta[] {
  const cuenta = new Map<string, number>(); // cuántas lleva cogidas cada tema
  const salida: Pregunta[] = [];

  for (const p of preguntas) {
    if (salida.length >= n) break; // ya hay suficientes

    const c = cuenta.get(p.tema) ?? 0; // `?? 0`: si el tema aún no aparece, lleva 0
    if (c < max) {
      salida.push(p);
      cuenta.set(p.tema, c + 1);
    }
    // Si el tema ya llegó al tope, esta pregunta se salta.
  }
  return salida;
}

/**
 * Crea una sesión de repaso: una lista de `total` preguntas sin repetir.
 *
 * Las preguntas se eligen por prioridad, en tres grupos que nunca se solapan:
 *
 * 1. **Pendientes**: ya vistas y a las que les toca hoy según Leitner.
 *    Es lo más importante, porque si no se repasan se olvidan.
 * 2. **Nuevas**: nunca vistas. Hay siempre al menos `maxNuevas` huecos reservados
 *    para ellas, para que el usuario siga avanzando aunque tenga muchas pendientes.
 * 3. **Adelantadas**: ya vistas que todavía no tocaban. Solo entran si faltan
 *    preguntas para llegar a `total`. Así nunca hay que esperar a que "toque" algo
 *    y se pueden hacer varias sesiones al día.
 *
 * Es una función pura: recibe el banco y el progreso y no guarda nada.
 *
 * @param banco todas las preguntas
 * @param prog progreso del usuario (estado Leitner por id de pregunta)
 * @param ahora momento actual en milisegundos (`Date.now()`)
 * @param total tamaño de la sesión
 * @param maxNuevas huecos reservados para preguntas nuevas
 */
export function crearSesion(
  banco: readonly Pregunta[],
  prog: Progreso,
  ahora: number,
  total = 25,
  maxNuevas = 8,
): Pregunta[] {
  // 1. Separar el banco en "pendientes de hoy" y "nunca vistas".
  //    Una pregunta sin entrada en `prog` es que nunca se ha respondido.
  const pendientes = banco.filter((p) => prog[p.id] && prog[p.id].proximo <= ahora);
  const sinVer = banco.filter((p) => !prog[p.id]);

  // 2. Repaso: pendientes al azar, como mucho `total - maxNuevas` (17 por defecto,
  //    para dejar sitio a 8 nuevas) y como mucho un 40 % del mismo tema (10 de 25).
  const repaso = conTopePorTema(barajar(pendientes), total - maxNuevas, Math.ceil(total * 0.4));

  // 3. Nuevas: ocupan todos los huecos que queden (pueden ser más de 8 si hay
  //    pocas pendientes), repartidas por turnos entre los temas.
  const nuevas = porTurnos(sinVer, total - repaso.length);

  // 4. Adelantadas: si aún faltan preguntas (ya se vieron todas y hay pocas
  //    pendientes), se cogen las vistas que no se han usado, primero las que
  //    antes iban a tocar (`proximo` más bajo). Así las falladas hoy, que tocan
  //    mañana, salen antes que las que se acertaron y tocan dentro de un mes.
  //    Se baraja antes de ordenar para que, a igual fecha, el orden sea aleatorio.
  const usadas = new Set([...repaso, ...nuevas].map((p) => p.id));
  const adelantadas = barajar(banco.filter((p) => prog[p.id] && !usadas.has(p.id)))
    .sort((a, b) => prog[a.id].proximo - prog[b.id].proximo)
    .slice(0, total - repaso.length - nuevas.length);

  // 5. Mezclar los tres grupos para que no salgan primero todas las de repaso,
  //    luego todas las nuevas, etc.
  return barajar([...repaso, ...nuevas, ...adelantadas]);
}
