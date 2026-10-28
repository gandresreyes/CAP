import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Pregunta } from '../../shared/models/pregunta';
import { BancoPreguntas } from '../../shared/services/banco-preguntas';
import { ProgresoStore } from '../../shared/services/progreso-store';
import { SesionEnCurso } from '../../shared/services/sesion-en-curso';
import { MAX_SESIONES_DIA, SesionesDiarias } from '../../shared/services/sesiones-diarias';
import { ordenarOpciones } from '../../shared/utils/opciones';
import { crearSesion } from '../../shared/utils/sesion';

/** Letras que se muestran junto a cada opción, por posición en pantalla. */
const LETRAS = ['A', 'B', 'C', 'D'];

/**
 * Pantalla de repaso (ruta `/repaso`).
 *
 * Flujo de una sesión:
 * 1. Se crean 25 preguntas con `crearSesion` (pendientes, nuevas y adelantadas).
 * 2. Se muestran de una en una. Al tocar una opción se corrige al momento:
 *    la correcta en verde, la elegida en rojo si falló, y la explicación.
 * 3. Las falladas se apuntan en `fallos`. Al acabar las 25 empieza el
 *    "Repaso de fallos": se repiten hasta acertarlas todas.
 * 4. Al final se muestra la nota (acertadas a la primera) y se cuenta la sesión
 *    para el límite de 3 al día.
 *
 * Tras cada respuesta la sesión se guarda en el navegador (`SesionEnCurso`). Si se
 * interrumpe (botón "Cerrar", recargar, cerrar la app…), al volver se pregunta si
 * se quiere retomar donde se dejó o empezar una nueva.
 *
 * Modo práctica (`/repaso?tema=…`, desde la pestaña Temas): la misma pantalla,
 * pero solo con preguntas de ese tema, sin límite diario y sin guardar para
 * retomar (así no pisa la sesión diaria a medias). Lo respondido sí cuenta para
 * el progreso.
 *
 * Todo el estado está en signals: cuando cambia uno, Angular vuelve a pintar
 * solo lo que depende de él. Con `OnPush` el componente no se repinta por
 * otras causas, lo que lo hace más eficiente.
 */
@Component({
  selector: 'app-repaso',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './repaso.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Repaso {
  // ---------------------------------------------------------------------------
  // Servicios
  // `inject()` pide a Angular la instancia compartida de cada servicio.
  // `protected` = accesible desde la plantilla; `private` = solo desde esta clase.
  // ---------------------------------------------------------------------------

  /** Banco de preguntas (y su estado de carga, que usa la plantilla). */
  protected readonly banco = inject(BancoPreguntas);
  /** Progreso Leitner: se lee para crear la sesión y se actualiza al responder. */
  private readonly progreso = inject(ProgresoStore);
  /** Contador de sesiones del día (límite de 3) y racha. */
  protected readonly sesiones = inject(SesionesDiarias);
  /** Sesión a medias guardada en el navegador, para poder retomarla. */
  private readonly enCurso = inject(SesionEnCurso);

  // ---------------------------------------------------------------------------
  // Constantes para la plantilla (la plantilla no puede leer constantes del
  // archivo directamente, solo propiedades de la clase).
  // ---------------------------------------------------------------------------

  protected readonly letras = LETRAS;
  protected readonly maxSesiones = MAX_SESIONES_DIA;

  // ---------------------------------------------------------------------------
  // Modo práctica por tema
  // ---------------------------------------------------------------------------

  /**
   * Tema a practicar, o `undefined` en el repaso diario normal.
   *
   * Llega desde la URL `/repaso?tema=…`: gracias a `withComponentInputBinding`
   * (en `app.config.ts`), el router pasa los parámetros de la URL a los `input()`
   * del componente que tengan el mismo nombre, sin más código.
   */
  readonly tema = input<string>();

  /** `true` si es una práctica de un tema (no cuenta para el límite diario ni se guarda). */
  protected readonly practica = computed(() => !!this.tema());

  /** Preguntas de las que se saca la sesión: las del tema en práctica, o todo el banco. */
  private readonly bancoActivo = computed(() => {
    const tema = this.tema();
    const todas = this.banco.preguntas();
    return tema ? todas.filter((p) => p.tema === tema) : todas;
  });

  /** Título de la cabecera según el modo y la fase. */
  protected readonly titulo = computed(() =>
    this.enFallos() ? 'Repaso de fallos' : this.practica() ? 'Práctica' : 'Repaso',
  );

  /** Adónde llevan "Cerrar" y "Volver": a Temas en la práctica, al inicio en el repaso diario. */
  protected readonly volverA = computed(() => (this.practica() ? '/temas' : '/'));

  // ---------------------------------------------------------------------------
  // Estado de la sesión
  // Un `signal` guarda un valor; se lee llamándolo (`indice()`) y se cambia con
  // `.set(valor)` o `.update(anterior => nuevo)`.
  // ---------------------------------------------------------------------------

  /**
   * Las 25 preguntas de la sesión.
   *
   * Es un `linkedSignal`: un valor que se calcula a partir de otros signals (como
   * un `computed`) pero que además se puede sobrescribir con `.set()`, que es lo
   * que hace "Otra sesión".
   *
   * Se recalcula cuando cambia `bancoActivo()`, es decir, cuando termina de
   * cargar el JSON o cuando llega el tema de la URL. El progreso se lee dentro de
   * `untracked`, que significa "leer sin vigilar": si no, cada respuesta (que
   * cambia el progreso) crearía una sesión nueva a mitad de la actual.
   *
   * En la práctica de un tema con menos de 25 preguntas, la sesión tiene todas
   * las del tema (p. ej. 3 en "Imagen de marca").
   */
  private readonly sesion = linkedSignal(() => {
    const banco = this.bancoActivo();
    return untracked(() => crearSesion(banco, this.progreso.progreso(), Date.now()));
  });

  /**
   * Preguntas falladas en esta sesión, en orden. Se preguntan otra vez al terminar
   * las 25 ("Repaso de fallos"). Si se vuelve a fallar una, se añade de nuevo al
   * final, así que la fase no acaba hasta acertarlas todas.
   */
  private readonly fallos = signal<Pregunta[]>([]);

  /**
   * Todo lo que se va a preguntar, en orden: las 25 de la sesión y detrás los fallos.
   * `indice` recorre esta lista de principio a fin.
   */
  protected readonly cola = computed(() => [...this.sesion(), ...this.fallos()]);

  /** Posición de la pregunta actual dentro de `cola` (empieza en 0). */
  protected readonly indice = signal(0);

  /** Texto de la opción elegida en la pregunta actual; `null` mientras no se ha respondido. */
  protected readonly elegida = signal<string | null>(null);

  /** Preguntas acertadas a la primera. Es la nota de la sesión (las repeticiones no cuentan). */
  protected readonly aciertos = signal(0);

  /**
   * Ids de las preguntas que ya cambiaron de caja en esta sesión. Sirve para que
   * solo cuente la primera respuesta: si fallas y luego aciertas en el repaso de
   * fallos, la pregunta no debe subir de caja (no la sabías a la primera).
   * Es un `Set` normal y no un signal porque la plantilla no lo muestra.
   */
  private readonly puntuadas = new Set<string>();

  // ---------------------------------------------------------------------------
  // Retomar una sesión interrumpida
  // ---------------------------------------------------------------------------

  /**
   * La sesión a medias que había guardada al entrar en esta pantalla.
   *
   * Es una foto fija (un valor normal, no un signal): mientras se responde, la
   * sesión actual también se va guardando, y no queremos que eso haga aparecer la
   * pregunta "¿retomar?" en mitad de la sesión.
   */
  private readonly guardadaAlEntrar = this.enCurso.guardada();

  /** Si el usuario ya eligió entre retomar o empezar de nuevo (o no había nada que elegir). */
  private readonly decidido = signal(this.guardadaAlEntrar === null);

  /**
   * La sesión que se puede retomar, ya con las preguntas completas, o `null` si no
   * hay que preguntar nada. Mientras no sea `null`, la plantilla muestra la
   * pregunta "Tienes una sesión a medias…".
   *
   * Depende de `banco.preguntas()` porque los ids guardados se convierten en
   * preguntas buscándolos en el banco (cuando termina de cargar). Si alguna ya no
   * existe (se quitó del JSON), la sesión no se puede reconstruir y no se ofrece.
   */
  protected readonly oferta = computed(() => {
    const g = this.guardadaAlEntrar;
    // En la práctica no se ofrece: la sesión guardada es la del repaso diario.
    if (this.decidido() || !g || this.practica()) return null;

    // Índice id → pregunta para buscar cada id al instante.
    const porId = new Map(this.banco.preguntas().map((p) => [p.id, p]));
    const sesion = g.sesion.map((id) => porId.get(id));
    const fallos = g.fallos.map((id) => porId.get(id));
    if ([...sesion, ...fallos].some((p) => !p)) return null;

    return {
      ...g,
      preguntas: sesion as Pregunta[],
      repetir: fallos as Pregunta[],
      // Texto de por dónde se iba: "la 12 de 25" o, si ya se pasó de las 25, el repaso de fallos.
      donde:
        g.indice < g.sesion.length
          ? `Ibas por la pregunta ${g.indice + 1} de ${g.sesion.length}.`
          : 'Estabas en el repaso de fallos.',
    };
  });

  // ---------------------------------------------------------------------------
  // Valores derivados
  // Un `computed` calcula un valor a partir de otros signals y se actualiza solo
  // cuando alguno de ellos cambia. Nunca se asignan a mano.
  // ---------------------------------------------------------------------------

  /** La pregunta que se está mostrando, o `undefined` si ya no quedan. */
  protected readonly actual = computed<Pregunta | undefined>(() => this.cola()[this.indice()]);

  /**
   * Las opciones en el orden en que se muestran (normalmente barajadas).
   * Al ser un `computed`, solo se baraja cuando cambia la pregunta, no cada vez que
   * se pinta la pantalla: así las opciones no saltan de sitio al responder.
   */
  protected readonly opciones = computed(() => ordenarOpciones(this.actual()?.opciones ?? []));

  /**
   * Texto de la respuesta correcta. Se compara por texto y no por posición porque,
   * al barajar, la correcta ya no está en la posición que dice `p.correcta`.
   */
  protected readonly correcta = computed(() => {
    const p = this.actual();
    return p ? p.opciones[p.correcta] : '';
  });

  /** Si ya se ha respondido la pregunta actual (bloquea las opciones y muestra la corrección). */
  protected readonly respondida = computed(() => this.elegida() !== null);

  /** Si la opción elegida es la correcta. */
  protected readonly acierto = computed(() => this.elegida() === this.correcta());

  /** Si ya se han respondido todas las preguntas de la cola (incluidos los fallos). */
  protected readonly terminada = computed(
    () => this.cola().length > 0 && this.indice() >= this.cola().length,
  );

  /**
   * Si la sesión aún no ha empezado (primera pregunta, sin responder). Sirve para
   * mostrar el aviso de "ya has hecho las 3 de hoy" al entrar, pero sin cortar
   * nunca una sesión que ya estaba en marcha.
   */
  protected readonly sinEmpezar = computed(() => this.indice() === 0 && !this.respondida());

  /** Número de preguntas de la sesión (normalmente 25), sin contar las repeticiones de fallos. */
  protected readonly total = computed(() => this.sesion().length);

  /** Si ya se pasaron las 25 y ahora solo se repiten las falladas ("Repaso de fallos"). */
  protected readonly enFallos = computed(() => this.indice() >= this.sesion().length);

  /**
   * Texto del contador de la cabecera.
   * - Durante la sesión: "X / 25", fijo, aunque se falle (los fallos no alargan la cuenta).
   * - En el repaso de fallos: "Quedan N", las que faltan por acertar.
   */
  protected readonly contador = computed(() =>
    this.enFallos()
      ? `Quedan ${this.cola().length - this.indice()}`
      : `${this.indice() + 1} / ${this.total()}`,
  );

  /** Porcentaje de la barra de avance: se llena con las 25 y se queda llena en la fase de fallos. */
  protected readonly avance = computed(() => Math.min(this.indice() / this.total(), 1) * 100);

  // ---------------------------------------------------------------------------
  // Acciones (las llama la plantilla al tocar botones)
  // ---------------------------------------------------------------------------

  /**
   * El usuario toca una opción.
   * @param opcion texto de la opción tocada
   */
  protected responder(opcion: string): void {
    const p = this.actual();
    // Ignorar si no hay pregunta o si ya se respondió (evita contar un doble toque).
    if (!p || this.respondida()) return;

    // Guardar la elección: la plantilla pinta la corrección al cambiar `elegida`.
    this.elegida.set(opcion);
    const acierto = opcion === this.correcta();

    // Solo la primera respuesta de cada pregunta en la sesión cuenta: actualiza su
    // caja Leitner (y lo guarda) y suma a la nota si acertó. Las repeticiones del
    // repaso de fallos son solo práctica y no tocan el progreso ni la nota.
    if (!this.puntuadas.has(p.id)) {
      this.puntuadas.add(p.id);
      this.progreso.responder(p.id, acierto);
      if (acierto) this.aciertos.update((n) => n + 1);
    }

    // Si falló, se apunta para el "Repaso de fallos" del final.
    if (!acierto) this.fallos.update((f) => [...f, p]);

    // Guardar ya, por si la app se cierra antes de pulsar "Siguiente".
    this.guardar();
  }

  /** Botón "Siguiente": pasa a la próxima pregunta y, si era la última, cuenta la sesión. */
  protected siguiente(): void {
    // Limpiar la respuesta para que la siguiente pregunta salga sin contestar.
    this.elegida.set(null);
    this.indice.update((i) => i + 1);

    // Si con esto se acabó la cola, la sesión está completa: cuenta para el límite
    // diario (salvo en la práctica, que es ilimitada).
    if (this.terminada() && !this.practica()) this.sesiones.registrar();

    // Guardar el avance (o borrar lo guardado si la sesión ha terminado).
    this.guardar();

    // Volver arriba, por si la pregunta anterior era larga y se había bajado.
    window.scrollTo({ top: 0 });
  }

  /** Botón "Retomar sesión": reconstruye la sesión guardada y sigue donde se dejó. */
  protected retomar(): void {
    const o = this.oferta();
    if (!o) return;

    // Restaurar cada pieza del estado tal como estaba al guardarla.
    this.sesion.set(o.preguntas);
    this.fallos.set(o.repetir);
    this.indice.set(o.indice);
    this.aciertos.set(o.aciertos);
    this.puntuadas.clear();
    o.puntuadas.forEach((id) => this.puntuadas.add(id));
    this.elegida.set(null);
    this.decidido.set(true);

    // Caso raro: se cerró justo tras responder la última pregunta. La sesión ya
    // estaba completa, así que se cuenta y se muestra el resultado directamente.
    if (this.terminada()) {
      this.sesiones.registrar();
      this.enCurso.borrar();
    }
  }

  /**
   * Botón "Empezar una nueva": descarta la sesión guardada y se queda con la nueva
   * que ya se creó al abrir la pantalla.
   *
   * No se pierde nada: lo respondido en la sesión anterior ya está guardado en el
   * progreso, y las preguntas que no llegaron a salir siguen siendo nuevas o
   * pendientes, así que aparecerán en próximas sesiones.
   */
  protected empezarNueva(): void {
    this.enCurso.borrar();
    this.decidido.set(true);
  }

  /**
   * Guarda la sesión actual en el navegador para poder retomarla, o borra lo
   * guardado si ya ha terminado.
   */
  private guardar(): void {
    // La práctica no se guarda: no debe pisar la sesión diaria que haya a medias.
    if (this.practica()) return;
    if (this.terminada()) {
      this.enCurso.borrar();
      return;
    }
    this.enCurso.guardar({
      sesion: this.sesion().map((p) => p.id),
      fallos: this.fallos().map((p) => p.id),
      // Si la pregunta actual ya está respondida, al retomar se sigue por la siguiente
      // (su respuesta ya contó; repetirla no tendría sentido).
      indice: this.indice() + (this.respondida() ? 1 : 0),
      aciertos: this.aciertos(),
      puntuadas: [...this.puntuadas],
    });
  }

  /**
   * Botón "Otra sesión" (u "Otra ronda" en la práctica): deja todo como al
   * principio, con preguntas nuevas.
   */
  protected nuevaSesion(): void {
    // En la práctica no se toca la sesión diaria guardada.
    if (!this.practica()) this.enCurso.borrar();
    this.puntuadas.clear();
    this.aciertos.set(0);
    this.elegida.set(null);
    this.indice.set(0);
    this.fallos.set([]);
    // Se crea con el progreso actualizado, así tiene en cuenta lo respondido en la anterior.
    this.sesion.set(crearSesion(this.bancoActivo(), this.progreso.progreso(), Date.now()));
  }
}
