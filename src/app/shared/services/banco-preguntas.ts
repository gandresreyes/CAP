import { computed, Injectable, resource } from '@angular/core';
import { Pregunta } from '../models/pregunta';

/**
 * Servicio que carga el banco de preguntas y lo comparte con toda la app.
 *
 * `providedIn: 'root'` significa que Angular crea una única instancia para toda
 * la app (un "singleton"): todas las pantallas que lo inyectan con `inject()`
 * reciben el mismo objeto, así que el JSON se descarga una sola vez.
 */
@Injectable({ providedIn: 'root' })
export class BancoPreguntas {
  /**
   * Petición del JSON.
   *
   * `resource()` es la forma moderna de Angular de cargar datos asíncronos: ejecuta
   * `loader` y expone el resultado como signals (`value`, `isLoading`, `error`).
   * Las pantallas solo leen esos signals y se actualizan solas cuando llegan los datos.
   *
   * `abortSignal` cancela la descarga si el recurso se descarta antes de terminar.
   * La ruta es relativa (`data/…`, sin `/` inicial) para respetar el `<base href>`.
   */
  private readonly recurso = resource({
    loader: async ({ abortSignal }) => {
      const res = await fetch('data/questions.json', { signal: abortSignal });
      // `fetch` no lanza error con un 404 o un 500: hay que comprobarlo a mano.
      if (!res.ok) throw new Error(`No se pudo cargar questions.json (${res.status})`);
      return (await res.json()) as Pregunta[];
    },
  });

  /**
   * Las preguntas. Mientras carga, o si falla, es una lista vacía en vez de
   * `undefined`, para que nadie tenga que comprobarlo antes de usarla.
   * (`value()` lanza un error si se lee cuando el recurso ha fallado; por eso
   * se pregunta antes con `hasValue()`).
   */
  readonly preguntas = computed(() => (this.recurso.hasValue() ? this.recurso.value() : []));

  /** `true` mientras se descarga el JSON (para mostrar "Cargando preguntas…"). */
  readonly cargando = this.recurso.isLoading;

  /** El error si la descarga falló (sin conexión y sin copia en caché), o `undefined`. */
  readonly error = this.recurso.error;

  /** Vuelve a pedir el JSON. Lo usa el botón "Reintentar" de la pantalla de error. */
  recargar(): void {
    this.recurso.reload();
  }
}
