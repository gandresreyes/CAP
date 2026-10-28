import { Pregunta } from '../models/pregunta';
import { Progreso } from '../models/progreso';
import { barajar } from './barajar';
import { nivelAcierto, NivelAcierto } from './estadisticas';
import { porTema } from './sesion';

/*
 * Reglas del simulacro (las mismas que el examen oficial del CAP)
 * --------------------------------------------------------------
 * - 100 preguntas tipo test con 4 opciones.
 * - 2 horas para responder.
 * - Cada acierto suma 1 punto; cada fallo resta 0,5; en blanco no suma ni resta.
 * - Se aprueba con 50 puntos o más.
 */

/** Preguntas del simulacro. */
export const PREGUNTAS_SIMULACRO = 100;
/** Tiempo para responder: 2 horas, en milisegundos. */
export const DURACION_SIMULACRO = 2 * 60 * 60 * 1000;
/** Puntos que resta cada respuesta incorrecta. */
export const PENALIZACION = 0.5;
/** Puntos necesarios para aprobar. */
export const NOTA_APROBADO = 50;

/**
 * Elige las preguntas del simulacro con el mismo reparto por temas que el examen real.
 *
 * Como todo el banco sale de exámenes oficiales, el peso de cada tema en el banco
 * es el mismo que tiene en los exámenes: si "Consumo de carburante" es el 17 % del
 * banco, el simulacro tendrá unas 17 preguntas de ese tema.
 *
 * Dentro de cada tema se priorizan las menos vistas (menos veces respondidas en
 * total, sumando aciertos y fallos): primero las que nunca han salido, luego las
 * vistas una vez, etc. Así cada simulacro trae preguntas distintas y se recorre
 * todo el banco. A igualdad de veces vistas, salen al azar.
 *
 * Las cuotas casi nunca salen enteras (p. ej. 17,3 preguntas). Se usa el "método
 * del resto mayor": cada tema recibe la parte entera de su cuota (17), y las
 * preguntas que faltan para llegar a 100 se dan, de una en una, a los temas con
 * mayor parte decimal. Así el reparto es lo más fiel posible y suma exactamente 100.
 *
 * @param banco todas las preguntas disponibles
 * @param progreso progreso del usuario, para saber cuántas veces se ha visto cada pregunta
 * @param total cuántas preguntas tendrá (100); si el banco tiene menos, salen todas
 */
export function crearSimulacro(
  banco: readonly Pregunta[],
  progreso: Progreso = {},
  total = PREGUNTAS_SIMULACRO,
): Pregunta[] {
  if (banco.length <= total) return barajar(banco);

  /** Veces que se ha respondido una pregunta (0 si nunca se ha visto). */
  const vistas = (p: Pregunta) => (progreso[p.id] ? progreso[p.id].aciertos + progreso[p.id].fallos : 0);

  // 1. Cuota exacta de cada tema, proporcional a su peso en el banco, y su parte entera.
  //    `porTema` devuelve cada tema con sus preguntas ya barajadas; luego se ordenan de
  //    menos a más vistas. `sort` es estable: las que empatan conservan el orden al
  //    azar del barajado, así que no salen siempre las mismas.
  const cuotas = [...porTema(banco).values()].map((grupo) => {
    const preguntas = grupo.sort((a, b) => vistas(a) - vistas(b));
    const exacta = (total * preguntas.length) / banco.length;
    return { preguntas, n: Math.floor(exacta), resto: exacta - Math.floor(exacta) };
  });

  // 2. Repartir las que faltan hasta `total` entre los temas con mayor parte decimal.
  //    (`[...cuotas]` copia la lista para ordenarla sin alterar la original.)
  const faltan = total - cuotas.reduce((suma, c) => suma + c.n, 0);
  [...cuotas]
    .sort((a, b) => b.resto - a.resto)
    .slice(0, faltan)
    .forEach((c) => c.n++);

  // 3. Coger las primeras `n` de cada tema (las menos vistas) y mezclar todas.
  return barajar(cuotas.flatMap((c) => c.preguntas.slice(0, c.n)));
}

/** Resultado de un tema dentro de un simulacro. */
export interface ResultadoTema {
  tema: string;
  preguntas: number;
  aciertos: number;
  /** % de preguntas del tema acertadas (las de en blanco cuentan como no acertadas). */
  porcentaje: number;
  nivel: NivelAcierto;
}

/** Corrección completa de un simulacro. */
export interface Correccion {
  aciertos: number;
  fallos: number;
  blancos: number;
  /** Puntos: aciertos − 0,5 × fallos. Puede ser negativa si se falla mucho. */
  nota: number;
  aprobado: boolean;
  /** Resultado por tema, del peor al mejor. */
  porTema: ResultadoTema[];
}

/**
 * Corrige un simulacro.
 *
 * Función pura: recibe las preguntas y lo que respondió el usuario y devuelve la
 * nota y el desglose, sin guardar nada.
 *
 * @param preguntas las preguntas del simulacro, en orden
 * @param respuestas para cada pregunta (misma posición), el índice de la opción
 *   elegida en `opciones` (0 = A … 3 = D), o `null` si se dejó en blanco
 */
export function corregir(preguntas: readonly Pregunta[], respuestas: readonly (number | null)[]): Correccion {
  let aciertos = 0;
  let fallos = 0;
  // Acumulado por tema: preguntas y aciertos.
  const temas = new Map<string, { preguntas: number; aciertos: number }>();

  preguntas.forEach((p, i) => {
    const r = respuestas[i];
    const acierto = r === p.correcta;
    if (r !== null) {
      if (acierto) aciertos++;
      else fallos++;
    }
    const t = temas.get(p.tema) ?? { preguntas: 0, aciertos: 0 };
    t.preguntas++;
    if (acierto) t.aciertos++;
    temas.set(p.tema, t);
  });

  const nota = aciertos - fallos * PENALIZACION;
  return {
    aciertos,
    fallos,
    blancos: preguntas.length - aciertos - fallos,
    nota,
    aprobado: nota >= NOTA_APROBADO,
    porTema: [...temas]
      .map(([tema, t]) => {
        const porcentaje = Math.round((t.aciertos / t.preguntas) * 100);
        return { tema, ...t, porcentaje, nivel: nivelAcierto(porcentaje) };
      })
      .sort((a, b) => a.porcentaje - b.porcentaje),
  };
}

/**
 * Formatea un tiempo en milisegundos como reloj: "1:59:07" o, por debajo de una
 * hora, "59:07". Se redondea hacia arriba para que el reloj no marque "0:00"
 * mientras aún queda una fracción de segundo.
 */
export function formatearTiempo(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dos = (n: number) => String(n).padStart(2, '0'); // 7 → "07"
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${m}:${dos(s)}`;
}

/** Formatea una nota con coma decimal y como mucho un decimal: 62.5 → "62,5", 70 → "70". */
export const formatearNota = (nota: number): string =>
  nota.toLocaleString('es-ES', { maximumFractionDigits: 1 });
