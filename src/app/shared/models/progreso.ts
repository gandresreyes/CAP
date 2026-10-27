export interface Estado {
  caja: number;
  proximo: number; // medianoche local del día en que vuelve a salir
  aciertos: number;
  fallos: number;
}

export type Progreso = Record<string, Estado>; // por id de pregunta
