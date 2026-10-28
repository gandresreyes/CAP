/*
 * Lectura y escritura seguras en `localStorage`.
 *
 * Por qué: `localStorage` puede fallar. Si está lleno, en algunos modos privados o si
 * el navegador lo tiene bloqueado, `setItem` lanza un error; y si alguien edita a mano
 * un dato (o se guarda a medias), `JSON.parse` lanza otro al leerlo. Sin protección,
 * un error así rompería la app en mitad de una respuesta.
 *
 * Estas funciones nunca lanzan errores: si algo falla, se avisa en la consola y la
 * app sigue funcionando con los datos que tiene en memoria (lo que no se pudo guardar
 * se perderá al cerrarla, pero no se corta el estudio).
 *
 * Las usan todos los servicios que guardan datos, en vez de llamar a `localStorage`
 * directamente.
 */

/**
 * Lee un valor guardado como JSON.
 *
 * @param clave nombre con el que se guardó (p. ej. `'cap-progreso'`)
 * @param porDefecto lo que se devuelve si no hay nada guardado o no se puede leer
 * @example leerJSON<Progreso>('cap-progreso', {})
 */
export function leerJSON<T>(clave: string, porDefecto: T): T {
  try {
    const texto = localStorage.getItem(clave);
    // `?? porDefecto` cubre también el caso de que se guardara `null`.
    return texto === null ? porDefecto : ((JSON.parse(texto) as T) ?? porDefecto);
  } catch (error) {
    console.warn(`No se pudo leer "${clave}" del almacenamiento`, error);
    return porDefecto;
  }
}

/**
 * Guarda un valor como JSON.
 *
 * @returns `true` si se guardó; `false` si falló (almacenamiento lleno o bloqueado).
 *   Quien llama puede ignorarlo: los datos siguen en memoria igualmente.
 */
export function guardarJSON(clave: string, valor: unknown): boolean {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    console.warn(`No se pudo guardar "${clave}" en el almacenamiento`, error);
    return false;
  }
}

/** Borra un valor guardado. Si falla, solo avisa en la consola. */
export function borrarJSON(clave: string): void {
  try {
    localStorage.removeItem(clave);
  } catch (error) {
    console.warn(`No se pudo borrar "${clave}" del almacenamiento`, error);
  }
}

/**
 * Avisa cuando otra pestaña de la app cambia (o borra) un valor guardado.
 *
 * Por qué: cada servicio tiene sus datos en memoria y, al guardar, escribe el objeto
 * entero. Con dos pestañas abiertas, la que escribe la última sobrescribiría lo que
 * hizo la otra. El navegador lanza el evento `storage` en las demás pestañas cada vez
 * que una cambia `localStorage`; al recibirlo, el servicio vuelve a leer el dato y
 * su memoria queda al día antes de su próxima escritura.
 *
 * (En la pestaña que escribe no salta el evento, solo en las otras.)
 *
 * @param clave clave a vigilar (p. ej. `'cap-progreso'`)
 * @param alCambiar qué hacer al cambiar: normalmente, volver a leerla con `leerJSON`
 */
export function alCambiarEnOtraPestana(clave: string, alCambiar: () => void): void {
  addEventListener('storage', (e) => {
    // `e.key === null` significa que se borró todo el almacenamiento (`localStorage.clear()`).
    if (e.key === clave || e.key === null) alCambiar();
  });
}
