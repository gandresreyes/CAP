import { Pregunta } from '../models/pregunta';
import { Progreso } from '../models/progreso';
import { barajar } from './barajar';

export function porTema(preguntas: readonly Pregunta[]): Map<string, Pregunta[]> {
  const grupos = new Map<string, Pregunta[]>();
  for (const p of barajar(preguntas)) {
    if (!grupos.has(p.tema)) grupos.set(p.tema, []);
    grupos.get(p.tema)!.push(p);
  }
  return grupos;
}

/** Elige `n` preguntas alternando entre temas para que no salga solo uno. */
export function porTurnos(preguntas: readonly Pregunta[], n: number): Pregunta[] {
  const colas = [...porTema(preguntas).values()];
  const salida: Pregunta[] = [];
  while (salida.length < n && colas.some((c) => c.length)) {
    for (const c of colas) {
      if (c.length && salida.length < n) salida.push(c.shift()!);
    }
  }
  return salida;
}

/** Toma hasta `n` preguntas sin pasar de `max` por tema. */
function conTopePorTema(preguntas: readonly Pregunta[], n: number, max: number): Pregunta[] {
  const cuenta = new Map<string, number>();
  const salida: Pregunta[] = [];
  for (const p of preguntas) {
    if (salida.length >= n) break;
    const c = cuenta.get(p.tema) ?? 0;
    if (c < max) {
      salida.push(p);
      cuenta.set(p.tema, c + 1);
    }
  }
  return salida;
}

export function crearSesion(
  banco: readonly Pregunta[],
  prog: Progreso,
  ahora: number,
  total = 25,
  maxNuevas = 8,
): Pregunta[] {
  const pendientes = banco.filter((p) => prog[p.id] && prog[p.id].proximo <= ahora);
  const sinVer = banco.filter((p) => !prog[p.id]);
  const repaso = conTopePorTema(barajar(pendientes), total - maxNuevas, Math.ceil(total * 0.4));
  const nuevas = porTurnos(sinVer, total - repaso.length);
  return barajar([...repaso, ...nuevas]);
}
