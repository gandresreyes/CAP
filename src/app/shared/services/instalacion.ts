import { computed, Injectable, signal } from '@angular/core';

/** Clave en `localStorage` para recordar que el usuario cerró el aviso de instalación. */
const KEY = 'cap-aviso-instalar-cerrado';

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
 * Decide si mostrar el aviso "Instala la app" en iPhone.
 *
 * En Android, Chrome ofrece instalar la PWA él solo (aviso propio o menú ⋮ →
 * "Instalar aplicación"). En iPhone no hay aviso automático: hay que hacerlo a
 * mano desde Safari (Compartir → "Añadir a pantalla de inicio"), y casi nadie lo
 * sabe. Por eso se explica en Inicio, solo en iPhone y solo si aún no está instalada.
 */
@Injectable({ providedIn: 'root' })
export class Instalacion {
  /** Si el usuario cerró el aviso (con la ✕). */
  private readonly cerrado = signal(leerCerrado());

  /** Mostrar el aviso: iPhone/iPad, abierta en el navegador (no instalada) y sin cerrar. */
  readonly mostrarAvisoIOS = computed(() => esIOS() && !enModoApp() && !this.cerrado());

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
