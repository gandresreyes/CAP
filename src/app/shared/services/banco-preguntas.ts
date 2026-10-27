import { computed, Injectable, resource } from '@angular/core';
import { Pregunta } from '../models/pregunta';

@Injectable({ providedIn: 'root' })
export class BancoPreguntas {
  private readonly recurso = resource({
    loader: async ({ abortSignal }) => {
      const res = await fetch('data/questions.json', { signal: abortSignal });
      if (!res.ok) throw new Error(`No se pudo cargar questions.json (${res.status})`);
      return (await res.json()) as Pregunta[];
    },
  });

  readonly preguntas = computed(() => (this.recurso.hasValue() ? this.recurso.value() : []));
  readonly cargando = this.recurso.isLoading;
  readonly error = this.recurso.error;

  recargar(): void {
    this.recurso.reload();
  }
}
