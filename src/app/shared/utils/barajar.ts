/**
 * Devuelve una copia del array con los elementos en orden aleatorio.
 *
 * Usa el algoritmo Fisher-Yates, que garantiza que todas las ordenaciones posibles
 * tienen la misma probabilidad. (El típico `arr.sort(() => Math.random() - 0.5)`
 * parece funcionar, pero reparte mal: unas ordenaciones salen más que otras).
 *
 * No modifica el array original: trabaja sobre una copia. Por eso acepta
 * `readonly T[]`, y se puede usar con datos que no deben cambiar (como el banco).
 *
 * @example barajar([1, 2, 3]) // → p. ej. [3, 1, 2]
 */
export function barajar<T>(arr: readonly T[]): T[] {
  // Copia para no tocar el original.
  const a = [...arr];

  // Recorre el array de atrás hacia delante. En cada paso elige al azar una
  // posición `j` entre 0 e `i` (ambas incluidas) e intercambia los elementos.
  // Lo que queda a la derecha de `i` ya está colocado y no se vuelve a tocar.
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]; // intercambio con desestructuración
  }
  return a;
}
