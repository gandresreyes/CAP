import { Injectable } from '@angular/core';

/** Marca para reconocer que un archivo es una copia de esta app (y no cualquier JSON). */
const APP = 'cap-estudio';

/**
 * Datos que se copian: todo lo que la app guarda en `localStorage`.
 * - `cap-progreso`: cajas Leitner y aciertos/fallos de cada pregunta (lo más importante).
 * - `cap-sesiones`: sesiones de hoy y días con sesión (para la racha).
 * - `cap-simulacros`: historial de notas de los simulacros.
 * - `cap-sesion-en-curso` y `cap-simulacro`: lo que esté a medias.
 */
const CLAVES = ['cap-progreso', 'cap-sesiones', 'cap-simulacros', 'cap-sesion-en-curso', 'cap-simulacro'];

/** Formato del archivo de copia. */
interface Copia {
  app: typeof APP;
  /** Versión del formato, por si algún día cambia. */
  version: 1;
  /** Cuándo se hizo la copia (ISO, legible al abrir el archivo). */
  fecha: string;
  /** Contenido de cada clave, ya como objeto (no como texto), para que el archivo sea legible. */
  datos: Record<string, unknown>;
}

/**
 * Exporta e importa todo el progreso a un archivo `.json`.
 *
 * Por qué hace falta: la app no tiene servidor, así que el progreso vive solo en
 * el navegador de este móvil. Si se borran los datos del navegador o se cambia de
 * móvil, se pierde. Con una copia se puede recuperar o pasar a otro dispositivo.
 */
@Injectable({ providedIn: 'root' })
export class CopiaSeguridad {
  /**
   * Descarga un archivo `cap-progreso-AAAA-MM-DD.json` con todos los datos.
   *
   * Se crea el archivo en memoria (`Blob`), se le da una URL temporal y se simula
   * un clic en un enlace de descarga; después se libera la URL.
   */
  exportar(): void {
    const datos: Record<string, unknown> = {};
    for (const clave of CLAVES) {
      const valor = localStorage.getItem(clave);
      if (valor !== null) datos[clave] = JSON.parse(valor);
    }
    const copia: Copia = { app: APP, version: 1, fecha: new Date().toISOString(), datos };

    const blob = new Blob([JSON.stringify(copia, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `cap-progreso-${copia.fecha.slice(0, 10)}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Restaura una copia: sustituye los datos actuales por los del archivo.
   *
   * Comprueba antes que el archivo es una copia de esta app; si no, no toca nada
   * y devuelve un mensaje de error para mostrarlo. Si va bien, devuelve `null`.
   *
   * Después hay que recargar la página: los servicios leen `localStorage` al
   * arrancar, así que no verían los datos nuevos hasta entonces.
   *
   * @param texto contenido del archivo elegido
   */
  importar(texto: string): string | null {
    let copia: Partial<Copia>;
    try {
      copia = JSON.parse(texto);
    } catch {
      return 'El archivo no es válido.';
    }
    if (copia?.app !== APP || typeof copia.datos !== 'object' || copia.datos === null) {
      return 'Este archivo no es una copia de CAP Estudio.';
    }

    // Sustituir: se borra lo que haya y se escribe solo lo que trae la copia
    // (y solo claves conocidas, para no meter datos extraños).
    for (const clave of CLAVES) {
      localStorage.removeItem(clave);
      if (clave in copia.datos) localStorage.setItem(clave, JSON.stringify(copia.datos[clave]));
    }
    return null;
  }
}
