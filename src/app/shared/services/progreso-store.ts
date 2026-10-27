import { Injectable, signal } from '@angular/core';
import { Estado, Progreso } from '../models/progreso';
import { siguienteEstado } from '../utils/leitner';

const KEY = 'cap-progreso';

function leer(): Progreso {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Injectable({ providedIn: 'root' })
export class ProgresoStore {
  private readonly estado = signal<Progreso>(leer());
  readonly progreso = this.estado.asReadonly();

  /** Aplica Leitner a la pregunta, guarda y devuelve su nuevo estado. */
  responder(id: string, acierto: boolean): Estado {
    const e = siguienteEstado(this.estado()[id], acierto, Date.now());
    this.estado.update((p) => ({ ...p, [id]: e }));
    localStorage.setItem(KEY, JSON.stringify(this.estado()));
    return e;
  }
}
