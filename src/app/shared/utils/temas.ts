/**
 * Separa el nombre de un tema en su número del temario y su título, para
 * mostrarlos con estilos distintos (el número en una píldora gris, el título en grande).
 *
 * @example
 * partirTema('1.3 bis Riesgos del tráfico') // → { codigo: '1.3 bis', titulo: 'Riesgos del tráfico' }
 * partirTema('2.1 Entorno social y tacógrafo') // → { codigo: '2.1', titulo: 'Entorno social y tacógrafo' }
 *
 * Si el nombre no empieza por un número (un tema mal escrito en el JSON), se
 * devuelve entero como título para que al menos se vea.
 */
export function partirTema(tema: string): { codigo: string; titulo: string } {
  // `\d+\.\d+` = "1.3"; `(?: bis)?` = " bis" opcional; después, un espacio y el resto.
  const m = /^(\d+\.\d+(?: bis)?) (.+)$/.exec(tema);
  return m ? { codigo: m[1], titulo: m[2] } : { codigo: '', titulo: tema };
}
