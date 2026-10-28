import { Pregunta } from '../models/pregunta';
import { Progreso } from '../models/progreso';
import { inicioDelDia } from './leitner';

/** Resultado de un tema: cuántas veces se han respondido sus preguntas y qué % se acertó. */
export interface AciertoTema {
  tema: string;
  respondidas: number; // aciertos + fallos (una pregunta respondida 3 veces cuenta 3)
  porcentaje: number; // 0 a 100, redondeado
}

/**
 * Calcula el porcentaje de acierto de cada tema y los ordena de peor a mejor.
 *
 * Solo aparecen los temas en los que se ha respondido alguna pregunta: un tema
 * sin respuestas no es "flojo", simplemente no se ha practicado.
 *
 * Se usa en Inicio ("Temas más flojos") y servirá para Progreso y Temas.
 */
export function aciertoPorTema(banco: readonly Pregunta[], prog: Progreso): AciertoTema[] {
  // 1. Sumar los aciertos y fallos de todas las preguntas de cada tema.
  //    Se recorre el banco (no el progreso) para saber el tema de cada pregunta
  //    e ignorar progreso de preguntas que ya no existan en el banco.
  const temas = new Map<string, { aciertos: number; fallos: number }>();
  for (const p of banco) {
    const e = prog[p.id];
    if (!e) continue; // nunca respondida: no suma nada

    const t = temas.get(p.tema) ?? { aciertos: 0, fallos: 0 };
    t.aciertos += e.aciertos;
    t.fallos += e.fallos;
    temas.set(p.tema, t);
  }

  // 2. Convertir cada tema en un `AciertoTema` con su porcentaje
  //    y ordenar de menor a mayor porcentaje (el peor primero).
  return [...temas]
    .map(([tema, { aciertos, fallos }]) => ({
      tema,
      respondidas: aciertos + fallos,
      porcentaje: Math.round((aciertos / (aciertos + fallos)) * 100),
    }))
    .filter((t) => t.respondidas > 0) // evita dividir entre 0
    .sort((a, b) => a.porcentaje - b.porcentaje);
}

/**
 * Calcula la racha: cuántos días seguidos se ha terminado al menos una sesión.
 *
 * Como en Duolingo, si hoy todavía no has estudiado pero ayer sí, la racha no se
 * ha roto: se cuenta desde ayer y tienes hasta medianoche para mantenerla.
 *
 * @example
 * // Estudiaste anteayer, ayer y hoy → 3
 * // Estudiaste anteayer y ayer, hoy aún no → 2 (sigue viva)
 * // Tu último día fue anteayer → 0 (se rompió ayer)
 *
 * @param dias medianoches de los días con alguna sesión terminada
 * @param hoy medianoche de hoy
 */
export function calcularRacha(dias: readonly number[], hoy: number): number {
  // Un Set permite comprobar si un día está en la lista de forma inmediata.
  const hechos = new Set(dias);

  // Punto de partida: hoy si ya hay sesión hoy; si no, ayer.
  let dia = hechos.has(hoy) ? hoy : inicioDelDia(hoy, -1);

  // Ir hacia atrás día a día y contar hasta encontrar un día sin sesión.
  let racha = 0;
  while (hechos.has(dia)) {
    racha++;
    dia = inicioDelDia(dia, -1);
  }
  return racha;
}
