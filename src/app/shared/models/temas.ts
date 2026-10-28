/**
 * El temario de Mercancías (RD 284/2021), agrupado en módulos igual que el índice
 * del libro del curso.
 *
 * Los nombres de tema tienen que coincidir exactamente con el campo `tema` de las
 * preguntas en `questions.json` (la tabla completa, con qué entra en cada tema,
 * está en CLAUDE.md).
 *
 * Se usa para mostrar los temas en el orden del temario y agrupados; ordenarlos
 * por nombre no serviría (pondría "1.3 bis" antes que "1.3 Consumo").
 */
export const MODULOS: readonly { nombre: string; temas: readonly string[] }[] = [
  {
    nombre: 'Conducción racional',
    temas: [
      '1.1 Cadena cinemática',
      '1.2 Dispositivos de seguridad',
      '1.3 Consumo de carburante',
      '1.3 bis Riesgos del tráfico',
      '1.4 Carga del vehículo',
    ],
  },
  {
    nombre: 'Reglamentación',
    temas: ['2.1 Entorno social y tacógrafo', '2.2 Reglamentación de mercancías'],
  },
  {
    nombre: 'Salud, seguridad y servicio',
    temas: [
      '3.1 Riesgos de la carretera',
      '3.2 Delincuencia e inmigración',
      '3.3 Riesgos físicos',
      '3.4 Aptitud física y mental',
      '3.5 Emergencias',
      '3.6 Imagen de marca',
      '3.7 Entorno económico',
    ],
  },
];
