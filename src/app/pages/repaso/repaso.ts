import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Pregunta } from '../../shared/models/pregunta';
import { Estado } from '../../shared/models/progreso';
import { BancoPreguntas } from '../../shared/services/banco-preguntas';
import { ProgresoStore } from '../../shared/services/progreso-store';
import { barajar } from '../../shared/utils/barajar';
import { INTERVALOS } from '../../shared/utils/leitner';
import { crearSesion } from '../../shared/utils/sesion';

const LETRAS = ['A', 'B', 'C', 'D'];

@Component({
  selector: 'app-repaso',
  imports: [NgOptimizedImage],
  templateUrl: './repaso.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Repaso {
  protected readonly banco = inject(BancoPreguntas);
  private readonly progreso = inject(ProgresoStore);

  protected readonly letras = LETRAS;

  // La sesión se crea cuando llega el banco; el progreso se lee sin seguirlo
  // para que responder no regenere la sesión.
  protected readonly cola = linkedSignal(() => {
    const banco = this.banco.preguntas();
    return untracked(() => crearSesion(banco, this.progreso.progreso(), Date.now()));
  });
  protected readonly indice = signal(0);
  protected readonly elegida = signal<string | null>(null);
  protected readonly aciertos = signal(0);
  private readonly estado = signal<Estado | null>(null);
  private readonly puntuadas = new Set<string>(); // ids que ya cambiaron de caja en esta sesión

  protected readonly actual = computed<Pregunta | undefined>(() => this.cola()[this.indice()]);
  protected readonly opciones = computed(() => barajar(this.actual()?.opciones ?? []));
  protected readonly correcta = computed(() => {
    const p = this.actual();
    return p ? p.opciones[p.correcta] : '';
  });
  protected readonly respondida = computed(() => this.elegida() !== null);
  protected readonly acierto = computed(() => this.elegida() === this.correcta());
  protected readonly terminada = computed(
    () => this.cola().length > 0 && this.indice() >= this.cola().length,
  );
  protected readonly total = computed(() => new Set(this.cola().map((p) => p.id)).size);
  protected readonly avance = computed(() => (this.indice() / this.cola().length) * 100);
  protected readonly cuandoVuelve = computed(() => {
    const e = this.estado();
    if (!e) return 'Repetición: no cambia tu progreso.';
    const dias = INTERVALOS[e.caja];
    return dias === 1 ? 'Volverá a salir mañana.' : `Volverá a salir en ${dias} días.`;
  });

  protected responder(opcion: string): void {
    const p = this.actual();
    if (!p || this.respondida()) return;

    this.elegida.set(opcion);
    const acierto = opcion === this.correcta();

    if (this.puntuadas.has(p.id)) {
      this.estado.set(null);
    } else {
      this.puntuadas.add(p.id);
      this.estado.set(this.progreso.responder(p.id, acierto));
      if (acierto) this.aciertos.update((n) => n + 1);
    }

    if (!acierto) this.cola.update((c) => [...c, p]);
  }

  protected siguiente(): void {
    this.elegida.set(null);
    this.indice.update((i) => i + 1);
    window.scrollTo({ top: 0 });
  }

  protected nuevaSesion(): void {
    this.puntuadas.clear();
    this.aciertos.set(0);
    this.elegida.set(null);
    this.indice.set(0);
    this.cola.set(crearSesion(this.banco.preguntas(), this.progreso.progreso(), Date.now()));
  }
}
