import { Pregunta } from '../models/pregunta';
import { Progreso } from '../models/progreso';
import { inicioDelDia } from './leitner';

/** Cómo de bien va un tema, para elegir el color: rojo, azul o verde. */
export type NivelAcierto = 'bajo' | 'medio' | 'alto';

/**
 * Traduce un porcentaje de acierto a un nivel:
 * - `bajo`: menos del 50 % (aún se falla más de lo que se acierta) → rojo
 * - `medio`: del 50 al 74 % → azul
 * - `alto`: 75 % o más → verde
 *
 * Está aquí para que Inicio y Temas usen exactamente los mismos umbrales.
 */
export function nivelAcierto(porcentaje: number): NivelAcierto {
  return porcentaje < 50 ? 'bajo' : porcentaje < 75 ? 'medio' : 'alto';
}

/** Resumen de un tema: cuántas preguntas tiene, cuántas se han visto y qué % se acierta. */
export interface ResumenTema {
  tema: string;
  /** Preguntas del tema en el banco. */
  preguntas: number;
  /** Preguntas del tema respondidas al menos una vez. */
  vistas: number;
  /** Total de respuestas del tema (aciertos + fallos; una pregunta respondida 3 veces cuenta 3). */
  respondidas: number;
  /** % de acierto (0–100, redondeado), o `null` si aún no se ha respondido nada del tema. */
  porcentaje: number | null;
}

/** Un `ResumenTema` que ya tiene porcentaje (se ha respondido algo). */
export type ResumenConAcierto = ResumenTema & { porcentaje: number };

/**
 * Calcula el resumen de cada tema que tenga preguntas en el banco.
 *
 * No se guarda en ningún sitio: se calcula al momento a partir del progreso
 * (aciertos y fallos de cada pregunta), así que siempre está al día.
 *
 * Los temas salen en el orden en que aparecen en el banco; para mostrarlos en el
 * orden del temario, cruzarlos con `MODULOS`.
 */
export function resumenPorTema(banco: readonly Pregunta[], prog: Progreso): ResumenTema[] {
  // 1. Acumular por tema: cuántas preguntas hay, cuántas se vieron y sus aciertos/fallos.
  const temas = new Map<string, { preguntas: number; vistas: number; aciertos: number; fallos: number }>();
  for (const p of banco) {
    const t = temas.get(p.tema) ?? { preguntas: 0, vistas: 0, aciertos: 0, fallos: 0 };
    t.preguntas++;
    const e = prog[p.id];
    if (e) {
      // Respondida alguna vez: cuenta como vista y suma su historial.
      t.vistas++;
      t.aciertos += e.aciertos;
      t.fallos += e.fallos;
    }
    temas.set(p.tema, t);
  }

  // 2. Convertir los totales en el resumen final con su porcentaje.
  return [...temas].map(([tema, t]) => {
    const respondidas = t.aciertos + t.fallos;
    return {
      tema,
      preguntas: t.preguntas,
      vistas: t.vistas,
      respondidas,
      // Sin respuestas no hay porcentaje (dividir entre 0); `null` = "sin datos".
      porcentaje: respondidas ? Math.round((t.aciertos / respondidas) * 100) : null,
    };
  });
}

/**
 * Los temas con alguna respuesta, ordenados de peor a mejor acierto.
 *
 * Un tema sin respuestas no aparece: no es "flojo", simplemente no se ha practicado.
 * Se usa en Inicio ("Temas más flojos").
 */
export function aciertoPorTema(banco: readonly Pregunta[], prog: Progreso): ResumenConAcierto[] {
  return (
    resumenPorTema(banco, prog)
      // El filtro con `t is …` le dice a TypeScript que, tras filtrar, `porcentaje` ya no es null.
      .filter((t): t is ResumenConAcierto => t.porcentaje !== null)
      .sort((a, b) => a.porcentaje - b.porcentaje)
  );
}

/**
 * A partir de qué caja Leitner se considera que una pregunta está "dominada".
 * Llegar a la caja 4 exige haberla acertado 3 veces seguidas, cada una en su día
 * (los aciertos antes de tiempo no suben de caja), sin fallarla entre medias.
 */
export const CAJA_DOMINADA = 4;

/**
 * Cuántas preguntas del banco se han visto y cuántas están dominadas.
 *
 * Solo cuenta las preguntas que siguen en el banco: si en el futuro se borra una
 * pregunta del JSON, su progreso antiguo no suma. Está aquí para que Inicio y
 * Progreso muestren siempre las mismas cifras.
 *
 * @example contarDominio(banco, prog) // → { vistas: 52, dominadas: 7 }
 */
export function contarDominio(banco: readonly Pregunta[], prog: Progreso): { vistas: number; dominadas: number } {
  let vistas = 0;
  let dominadas = 0;
  for (const p of banco) {
    const e = prog[p.id];
    if (!e) continue; // nunca respondida
    vistas++;
    if (e.caja >= CAJA_DOMINADA) dominadas++;
  }
  return { vistas, dominadas };
}

/**
 * Porcentaje de acierto de todas las respuestas dadas (de todas las preguntas del
 * banco), o `null` si aún no se ha respondido nada.
 */
export function aciertoGlobal(banco: readonly Pregunta[], prog: Progreso): number | null {
  let aciertos = 0;
  let fallos = 0;
  for (const p of banco) {
    const e = prog[p.id];
    if (e) {
      aciertos += e.aciertos;
      fallos += e.fallos;
    }
  }
  const total = aciertos + fallos;
  return total ? Math.round((aciertos / total) * 100) : null;
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
