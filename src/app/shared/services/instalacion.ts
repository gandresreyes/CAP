import { computed, Injectable, signal } from '@angular/core';

/** Clave en `localStorage` para recordar que el usuario cerró el aviso de instalación. */
const KEY = 'cap-aviso-instalar-cerrado';

/**
 * Evento `beforeinstallprompt` de Chrome/Edge/Android. No está en los tipos de
 * TypeScript porque no es un estándar (Safari y Firefox no lo tienen), así que se
 * declara aquí solo lo que se usa:
 * - `prompt()`: abre la ventana nativa "¿Instalar app?".
 * - `userChoice`: se resuelve cuando el usuario acepta o cancela.
 */
interface EventoInstalar extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Si el dispositivo es un iPhone o iPad.
 * Los iPad modernos se presentan como un Mac ("MacIntel"), pero con pantalla táctil:
 * por eso la segunda comprobación.
 */
function esIOS(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Si la app ya se está usando instalada (abierta desde el icono de la pantalla de
 * inicio) en vez de en una pestaña del navegador. `navigator.standalone` es la
 * forma antigua que usa Safari en iPhone.
 */
function enModoApp(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Lee si el aviso ya se cerró. Si `localStorage` falla (modo privado), se trata como no cerrado. */
function leerCerrado(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Decide cómo ofrecer "Instala la app" en Inicio, según el navegador:
 *
 * - Android / Chrome / Edge: el navegador avisa de que la app se puede instalar con
 *   el evento `beforeinstallprompt`. Se guarda ese evento y, al tocar el botón
 *   "Instalar", se abre la ventana nativa de instalación: un toque y listo.
 * - iPhone: Apple no deja que una web se instale sola (no existe ese evento ni
 *   ninguna otra forma, en ningún navegador). Hay que hacerlo a mano desde el menú
 *   Compartir del navegador, así que se explica en una línea.
 *
 * Se crea al arrancar la app (`provideAppInitializer` en `app.config.ts`) y no al
 * abrir Inicio, porque Chrome lanza el evento una sola vez, nada más cargar la
 * página: si nadie lo escucha en ese momento, se pierde.
 */
@Injectable({ providedIn: 'root' })
export class Instalacion {
  /** Si el usuario cerró el aviso (con la ✕). */
  private readonly cerrado = signal(leerCerrado());

  /**
   * Evento de instalación de Chrome, si el navegador lo ha ofrecido. `null` en
   * iPhone, si ya está instalada o si ya se usó (cada evento solo sirve una vez).
   */
  private readonly evento = signal<EventoInstalar | null>(null);

  /** Mostrar el botón "Instalar": Chrome ha ofrecido instalar y el aviso no está cerrado. */
  readonly puedeInstalar = computed(() => this.evento() !== null && !this.cerrado());

  /** Mostrar la explicación para iPhone/iPad: abierta en el navegador (no instalada) y sin cerrar. */
  readonly mostrarAvisoIOS = computed(() => esIOS() && !enModoApp() && !this.cerrado());

  constructor() {
    // `preventDefault()` evita la barrita de instalación que Chrome pone por su
    // cuenta abajo: ya la ofrece la app con su propio botón.
    addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.evento.set(e as EventoInstalar);
    });
    // Instalada (con el botón o desde el menú del navegador): se oculta el aviso.
    addEventListener('appinstalled', () => this.evento.set(null));
  }

  /**
   * Abre la ventana nativa de instalación del navegador. Se descarta el evento
   * después, acepte o no, porque Chrome no deja usarlo dos veces; si cancela, el
   * navegador lo volverá a ofrecer más adelante y el botón reaparecerá.
   */
  async instalar(): Promise<void> {
    const e = this.evento();
    if (!e) return;
    await e.prompt();
    await e.userChoice;
    this.evento.set(null);
  }

  /** Oculta el aviso y lo recuerda para no volver a mostrarlo. */
  cerrar(): void {
    this.cerrado.set(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // Sin almacenamiento (modo privado): se oculta solo durante esta visita.
    }
  }
}
