export interface Pregunta {
  id: string; // estable: nunca cambiarlo ni reutilizarlo (el progreso va ligado al id)
  tema: string;
  enunciado: string;
  opciones: string[]; // 4 opciones
  correcta: number; // índice en `opciones`
  explicacion: string;
  imagen?: string;
  origen?: string; // p. ej. "CyL 2025-03" o "GVA 2023-11"
}
