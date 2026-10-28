/**
 * Exámenes oficiales de los que salen las preguntas del banco.
 *
 * El JSON de preguntas solo guarda el `origen` ("CyL 2026-01"); aquí van los datos
 * que no caben en él (comunidad, fecha y lugar), para mostrarlos en "Acerca de".
 * Cada vez que se procesa un examen nuevo hay que añadir aquí su fila, igual que en
 * el registro de exámenes de CLAUDE.md. Si falta, la pantalla lo muestra igualmente
 * con el texto de `origen`.
 */
export interface Convocatoria {
  /** Igual que el campo `origen` de las preguntas, p. ej. "CyL 2026-01". */
  origen: string;
  /** Comunidad autónoma que convocó el examen. */
  comunidad: string;
  /** Ciudad del examen, si se apuntó al procesarlo. */
  lugar?: string;
  /** Fecha del examen; si no se apuntó el día, solo el mes ("enero 2026"). */
  fecha: string;
  /** Prefijo de los ids de sus preguntas, p. ej. "cyl-2026-01". */
  ids: string;
}

/** Exámenes procesados, en el orden en que se añadieron al banco. */
export const CONVOCATORIAS: readonly Convocatoria[] = [
  { origen: 'CyL 2026-01', comunidad: 'Castilla y León', fecha: 'enero 2026', ids: 'cyl-2026-01' },
  {
    origen: 'CyL 2026-10',
    comunidad: 'Castilla y León',
    fecha: 'octubre 2026',
    ids: 'cyl-2026-10',
  },
  {
    origen: 'AND 2026-03',
    comunidad: 'Andalucía',
    lugar: 'Sevilla',
    fecha: '14-03-2026',
    ids: 'and-2026-03',
  },
  {
    origen: 'ARA 2026-01',
    comunidad: 'Aragón',
    lugar: 'Zaragoza',
    fecha: '13-01-2026',
    ids: 'ara-2026-01',
  },
  {
    origen: 'AND 2026-05',
    comunidad: 'Andalucía',
    lugar: 'Sevilla',
    fecha: '16-05-2026',
    ids: 'and-2026-05',
  },
  {
    origen: 'AND 2026-01',
    comunidad: 'Andalucía',
    lugar: 'Málaga',
    fecha: '24-01-2026',
    ids: 'and-2026-01',
  },
  {
    origen: 'GVA 2026-05',
    comunidad: 'Comunitat Valenciana',
    fecha: '30-05-2026',
    ids: 'gva-2026-05',
  },
  {
    origen: 'GVA 2026-09',
    comunidad: 'Comunitat Valenciana',
    fecha: '26-09-2026',
    ids: 'gva-2026-09',
  },
  // No es un examen, sino el banco oficial de preguntas del Ministerio de Transportes
  // (versión del 16-03-2026), del que salen los exámenes de todas las comunidades.
  // Se usó para completar el banco hasta 1.000 preguntas.
  {
    origen: 'transportes.gob.es',
    comunidad: 'Ministerio de Transportes',
    lugar: 'banco oficial',
    fecha: '16-03-2026',
    ids: 'mit-2026-03',
  },
];
