import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Layout de las pantallas principales: el contenido arriba y la barra de pestañas
 * fija abajo (Hoy · Temas · Progreso), como en las apps de iPhone.
 *
 * Cómo funciona: en `app.routes.ts`, Inicio, Temas y Progreso son rutas "hijas" de
 * este componente. Angular pinta primero este layout y luego, dentro de su
 * `<router-outlet>`, la pantalla de la pestaña activa. Así la barra se escribe
 * una sola vez y se comparte entre las tres pantallas.
 *
 * El repaso (y en el futuro el simulacro) no es hijo de este layout, así que se
 * ve a pantalla completa, sin barra, para que el usuario se concentre.
 *
 * - `RouterOutlet`: el hueco donde se pinta la pestaña activa.
 * - `RouterLink`: convierte los enlaces en navegación interna (sin recargar la página).
 * - `RouterLinkActive`: añade una clase al enlace de la ruta actual (la pestaña en azul).
 */
@Component({
  selector: 'app-pestanas',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './pestanas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pestanas {}
