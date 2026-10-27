import { Estado } from '../models/progreso';

export const CAJA_MAX = 5;
export const INTERVALOS = [0, 1, 3, 7, 14, 30]; // días por caja

/** Medianoche local del día de `ahora` más `dias` días. */
export function inicioDelDia(ahora: number, dias = 0): number {
  const d = new Date(ahora);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d.getTime();
}

export function siguienteEstado(previo: Estado | undefined, acierto: boolean, ahora: number): Estado {
  const e = previo ?? { caja: 1, proximo: 0, aciertos: 0, fallos: 0 };
  const caja = acierto ? Math.min(e.caja + 1, CAJA_MAX) : 1;
  return {
    caja,
    proximo: inicioDelDia(ahora, INTERVALOS[caja]),
    aciertos: e.aciertos + (acierto ? 1 : 0),
    fallos: e.fallos + (acierto ? 0 : 1),
  };
}
