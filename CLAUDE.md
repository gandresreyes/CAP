# CAP Estudio
 
App web para estudiar el CAP (España) con un banco de preguntas de exámenes oficiales anteriores. La usan compañeros de curso. Sin presupuesto: todo gratis y sin backend.
 
Nombre provisional de la app: por decidir (candidatos: Tira Millas, Dale Gas, Rodaje).
 
## Objetivo
 
- Banco de ~1.000 preguntas (empezar con 4 exámenes, ~300 preguntas únicas).
- Repaso diario con repaso espaciado (sistema Leitner).
- Simulacro de 100 preguntas con proporción por temas parecida al examen real.
- Al terminar: acierto por tema (de peor a mejor) y sesión de refuerzo de los temas flojos.
## Principios
 
- Mínimo y práctico. Nada de sobreingeniería.
- Diseño limpio, estilo iOS/Apple.
- Es una app web, pero su uso principal es en el móvil (instalada como PWA). Se diseña primero para el móvil y el escritorio es secundario.
- Primero un MVP con un examen (~100 preguntas) probado por 3–4 compañeros durante una semana.
## Diseño para móvil
 
- Mobile-first: los estilos base son para el móvil (~375 px de ancho) y los breakpoints de Tailwind (`sm:`, `md:`) solo adaptan a pantallas mayores. En escritorio, el contenido va centrado con ancho máximo de móvil/tablet (`max-w-md mx-auto`), sin rediseñar.
- Una mano: las acciones principales abajo, al alcance del pulgar (barra inferior, botón "Siguiente" fijo abajo). Nada importante en las esquinas superiores.
- Zonas táctiles de al menos 44×44 px. Las opciones de respuesta son botones a todo el ancho, con separación suficiente para no fallar al tocar.
- Texto legible sin zoom: mínimo 16 px en el cuerpo (también en los `input`, para que iOS no haga zoom al enfocar). Enunciados largos con buen interlineado.
- Respetar las zonas seguras del iPhone (notch y barra de inicio): `viewport-fit=cover` en `index.html` y `env(safe-area-inset-*)` en la cabecera y la barra inferior.
- Altura de pantalla con `dvh` (no `vh`) para que la barra del navegador móvil no corte el contenido.
- Sin estados que dependan de `hover`: todo tiene que funcionar con el dedo. Feedback al tocar con `active:`.
- Una pregunta por pantalla, sin scroll horizontal. Las imágenes se ajustan al ancho (`w-full h-auto`).
- Modo oscuro automático con `prefers-color-scheme`, como en iOS: se redefinen los tokens de color en `styles.css`, así que no hace falta poner `dark:` en las plantillas.
- Probar siempre en el emulador móvil de DevTools (iPhone SE e iPhone 14) y, antes de publicar, en un móvil real.
## Stack
 
- Angular (standalone components + signals, sin librerías de estado).
- PWA con `ng add @angular/pwa` (instalable en el móvil y funciona sin conexión).
- Datos estáticos en `public/data/questions.json` (+ imágenes en `public/data/img/`), cargados con `fetch` y cacheados por el service worker.
- Progreso en `localStorage`.
- Despliegue en Vercel o Cloudflare Pages, conectado al repo (cada push publica solo).
- Las respuestas correctas van en el JSON sin ocultar: es una herramienta de estudio, no se protege.
- Angular 22, Tailwind CSS 4, Vitest, Prettier. Gestor de paquetes: `bun` (`bun install`, `bun run start`, `bunx ng g ...`).
## Estructura de carpetas
 
Organizado por páginas (una carpeta por pantalla) + `shared/` para lo que se usa en más de una.
 
```text
src/app/
  app.ts · app.html                # shell: <router-outlet> + barra inferior
  app.config.ts                    # providers (router, service worker…)
  app.routes.ts                    # rutas, todas con lazy loading
  pages/
    inicio/        inicio.ts · inicio.html
    repaso/
    simulacro/
    resultado/
    temas/
    acerca-de/
    admin/
  shared/
    components/    # UI reutilizable (tarjeta-pregunta, barra-inferior, boton…)
    services/      # estado y datos: banco de preguntas, progreso (Leitner), sesión, simulacro
    models/        # interfaces y tipos (Pregunta, Estado, Progreso)
    utils/         # funciones puras sin Angular (barajar, porTema, porTurnos, fusionar)
```
 
- Cada página es dueña de lo suyo: un componente que solo usa una página va dentro de su carpeta (`pages/repaso/opcion/`). Se mueve a `shared/` solo cuando lo usa una segunda página.
- `pages/` no importa de otras páginas; lo común pasa por `shared/`.
- `shared/` nunca importa de `pages/`.
- Nombres de archivo en kebab-case y sin sufijos de tipo (guía de estilo actual): `tarjeta-pregunta.ts`, clase `TarjetaPregunta`; un concepto por archivo. Plantilla en archivo aparte (`.html`) salvo componentes muy pequeños.
- Los componentes no tienen archivo `.css` ni `styleUrl`/`styles`: todos los estilos son globales (ver "Estilos").
- No crear archivos `.spec.ts`. En `angular.json` los schematics tienen `skipTests` y `style: none`, así que `ng g` ya no los genera.
## Buenas prácticas de Angular (solo API moderna)
 
Componentes
- Standalone siempre (es el valor por defecto: no escribir `standalone: true`). Nada de `NgModule`.
- `changeDetection: ChangeDetectionStrategy.OnPush`. App zoneless: no usar `zone.js` ni `NgZone`.
- Entradas/salidas con funciones: `input()`, `input.required()`, `output()`, `model()`. Consultas con `viewChild()`, `contentChildren()`. Nada de `@Input`, `@Output`, `@ViewChild`.
- Bindings del host en `host: {}` del decorador, no `@HostBinding` / `@HostListener`.
- Componentes de `shared/components` presentacionales: reciben datos por `input()` y emiten con `output()`; no inyectan servicios de estado.
- Miembros usados solo en la plantilla: `protected`. Campos que no cambian: `readonly`.
 
Plantillas
- Control de flujo nativo: `@if`, `@for` (siempre con `track`, p. ej. `track p.id`), `@switch`, `@let`, `@defer` para lo pesado. Nada de `*ngIf`, `*ngFor`, `ngSwitch`.
- `[class.x]` / `[style.x]` en vez de `ngClass` / `ngStyle`.
- Sin lógica en la plantilla: lo derivado va en un `computed()`. No llamar a métodos para pintar valores.
- Imágenes con `NgOptimizedImage` (`ngSrc`) y `alt`.
 
Estado y datos
- Estado con signals: `signal()`, `computed()`, `linkedSignal()`. `effect()` solo para efectos fuera de Angular (p. ej. guardar en `localStorage`), nunca para copiar un signal en otro.
- Servicios con `@Injectable({ providedIn: 'root' })` que exponen signals de solo lectura (`asReadonly()`) y métodos para cambiarlos.
- Inyección con `inject()`, no por constructor.
- Carga del JSON con `resource()` + `fetch` (sin `HttpClient` ni RxJS salvo que haga falta de verdad).
- La lógica de Leitner, sesión y simulacro como funciones puras en `shared/utils`; los servicios solo las orquestan y guardan.
 
Rutas
- Todas lazy: `loadComponent: () => import('./pages/inicio/inicio').then(m => m.Inicio)`.
- `provideRouter(routes, withComponentInputBinding())` para recibir parámetros de ruta como `input()` (p. ej. `temas/:tema`).
- `/admin` es una ruta normal, sin enlace en la barra.
 
Formularios
- Reactive Forms tipados (`FormBuilder.nonNullable`, `FormGroup`, `FormArray` para las 4 opciones) en el formulario de `/admin`. No usar Signal Forms ni template-driven (`ngModel`).
 
Estilos
- Todos los estilos en `src/styles.css` (global). Nada de CSS por componente.
- En las plantillas, utilidades de Tailwind para la maquetación (espaciado, flex, tamaños de texto).
- Piezas que se repiten (`.boton`, `.tarjeta`, `.opcion`, `.cabecera-fija`, `.pie-fijo`…) como clases en `@layer components` de `styles.css`, con `@apply`.
- Colores de la app como tokens de tema de Tailwind (`@theme` en `styles.css`: `bg-fondo`, `text-acento`, `text-correcto`…), no valores sueltos repetidos.
- Accesibilidad básica: botones reales (`<button>`), foco visible, contraste suficiente, `aria-label` en botones de solo icono.
## Modelo de datos
 
```ts
// Pregunta (estático, questions.json)
interface Pregunta {
  id: string;           // estable: nunca cambiarlo ni reutilizarlo (el progreso va ligado al id)
  tema: string;
  enunciado: string;
  opciones: string[];   // 4 opciones
  correcta: number;     // índice en `opciones`
  explicacion: string;
  imagen?: string;
  origen?: string;      // p. ej. "CyL 2025-03" o "GVA 2023-11"
}
 
// Progreso (localStorage, clave 'cap-progreso')
type Estado = { caja: number; proximo: number; aciertos: number; fallos: number };
type Progreso = Record<string, Estado>; // por id de pregunta
```
 
## Repaso espaciado (Leitner)
 
- 5 cajas, intervalos: caja 1 = 1 día, 2 = 3, 3 = 7, 4 = 14, 5 = 30.
- Acierto: sube una caja (máx. 5). Fallo: vuelve a la caja 1 (sale mañana).
- `proximo` cuenta por días naturales: es la medianoche local del día que toca, no "ahora + 24 h" (si no, lo fallado a las 20:00 no saldría al estudiar a las 9:00 del día siguiente).
- Dentro de una sesión, solo la primera respuesta a cada pregunta cambia su caja; las repeticiones de falladas son práctica.
```ts
const KEY = 'cap-progreso';
const DIA = 86_400_000;
const INTERVALOS = [0, 1, 3, 7, 14, 30];
 
const cargar = (): Progreso => JSON.parse(localStorage.getItem(KEY) ?? '{}');
const guardar = (p: Progreso) => localStorage.setItem(KEY, JSON.stringify(p));
 
function barajar<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
 
export function responder(id: string, acierto: boolean) {
  const prog = cargar();
  const e = prog[id] ?? { caja: 1, proximo: 0, aciertos: 0, fallos: 0 };
  e.caja = acierto ? Math.min(e.caja + 1, 5) : 1;
  e.proximo = Date.now() + INTERVALOS[e.caja] * DIA;
  acierto ? e.aciertos++ : e.fallos++;
  prog[id] = e;
  guardar(prog);
}
```
 
## Sesión diaria (25 preguntas)
 
- Junta las pendientes de hoy (`proximo <= ahora`) y rellena con nuevas hasta 25.
- Las nuevas se eligen por turnos entre temas para que no salga solo uno.
- Pendientes y nuevas son grupos disjuntos: no hay repetidas en la sesión.
- En el repaso, limitar cada tema a un máximo (~40 % de la sesión).
- Una pregunta fallada se añade al final de la misma sesión.
- Barajar las opciones al mostrarlas, guardando el texto correcto, no la posición.
```ts
function porTema(preguntas: Pregunta[]): Map<string, Pregunta[]> {
  const grupos = new Map<string, Pregunta[]>();
  for (const p of barajar(preguntas)) {
    if (!grupos.has(p.tema)) grupos.set(p.tema, []);
    grupos.get(p.tema)!.push(p);
  }
  return grupos;
}
 
function porTurnos(preguntas: Pregunta[], n: number): Pregunta[] {
  const colas = [...porTema(preguntas).values()];
  const salida: Pregunta[] = [];
  while (salida.length < n && colas.some(c => c.length)) {
    for (const c of colas) {
      if (c.length && salida.length < n) salida.push(c.shift()!);
    }
  }
  return salida;
}
 
export function crearSesion(banco: Pregunta[], total = 25, maxNuevas = 8) {
  const prog = cargar();
  const ahora = Date.now();
  const pendientes = banco.filter(p => prog[p.id] && prog[p.id].proximo <= ahora);
  const sinVer = banco.filter(p => !prog[p.id]);
  const repaso = barajar(pendientes).slice(0, total - maxNuevas);
  const nuevas = porTurnos(sinVer, total - repaso.length);
  return barajar([...repaso, ...nuevas]);
}
```
 
## Simulacro (100 preguntas)
 
- Cuotas por tema según su peso medio en los exámenes oficiales (p. ej. 15 % → 0,15).
- Más peso a las preguntas de Castilla y León (`origen`), que es donde se examinan.
- Sin feedback hasta el final, con temporizador.
- Si el redondeo da 99 o 101, ajustar con el tema de más peso.
```ts
function porCuotas(banco: Pregunta[], pesos: Record<string, number>, total = 100) {
  const grupos = porTema(banco);
  return barajar(
    Object.entries(pesos).flatMap(([tema, peso]) =>
      (grupos.get(tema) ?? []).slice(0, Math.round(total * peso))
    )
  );
}
```
 
## Pantallas
 
1. Inicio: repasos pendientes de hoy, racha, acceso al simulacro, temas más flojos.
2. Repaso: pregunta, 4 opciones; tras responder, correcta en verde, la elegida en rojo, explicación "Por qué" y "Volverá a salir mañana".
3. Simulacro: 100 preguntas con temporizador.
4. Resultado: nota, acierto por tema de peor a mejor, botón "Sesión de refuerzo" (falladas + temas flojos) y "Ver preguntas falladas".
5. Temas: práctica libre por tema.
6. Acerca de: avisos (ver abajo).
7. `/admin` (sin enlace en el menú, solo para el autor): ver abajo.
Barra inferior: Hoy · Temas · Progreso. Colores de referencia: fondo #F2F2F7, acento #0057C2, correcto #1B7A33, error #B8261B.
 
## Administración de preguntas (`/admin`)
 
Sin backend: no publica nada, solo genera un archivo.
 
- Carga el `questions.json` actual.
- Formulario para crear/editar: tema (desplegable con los existentes), enunciado, 4 opciones, correcta, explicación, imagen opcional.
- Importar un JSON y fusionarlo: valida, descarta duplicados (por enunciado normalizado) y avisa de las incompletas.
- Botón "Descargar questions.json" → el autor lo sube al repo y se despliega solo.
- Al corregir una pregunta, mantener su `id`.
```ts
function fusionar(base: Pregunta[], nuevas: Pregunta[]) {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const vistos = new Set(base.map(p => norm(p.enunciado)));
  const ids = new Set(base.map(p => p.id));
  const errores: string[] = [];
  const añadidas: Pregunta[] = [];
 
  for (const p of nuevas) {
    if (!p.enunciado || p.opciones?.length !== 4 || p.correcta == null || !p.tema) {
      errores.push(`Incompleta: ${p.enunciado?.slice(0, 40) ?? '(sin enunciado)'}`);
      continue;
    }
    if (vistos.has(norm(p.enunciado))) continue; // duplicada
    if (!p.id || ids.has(p.id)) p.id = crypto.randomUUID();
    vistos.add(norm(p.enunciado));
    ids.add(p.id);
    añadidas.push(p);
  }
  return { banco: [...base, ...añadidas], añadidas: añadidas.length, errores };
}
```
 
## Actualizar el banco de preguntas
 
- Opción actual: JSON en `public/data/` + push → despliegue automático.
- Si se separa el JSON de la app: repo de datos servido por jsDelivr (`https://cdn.jsdelivr.net/gh/<usuario>/cap-datos@main/questions.json`), y en `ngsw-config.json` moverlo de `assetGroups` a `dataGroups` con estrategia `freshness`.
- Si los compañeros deben poder corregir preguntas: Google Sheets publicado como CSV.
- Peso: 1.000 preguntas ≈ 500 KB (~120 KB con gzip). No hace falta dividirlo.
## PWA
 
- `ng add @angular/pwa`.
- Manifest: `name` "CAP Estudio" (o el nombre final), `short_name` "CAP", `display` "standalone", `theme_color` #0057C2, `background_color` #F2F2F7.
- En `ngsw-config.json`, añadir a `assetGroups`:
```json
{
  "name": "preguntas",
  "installMode": "prefetch",
  "updateMode": "prefetch",
  "resources": { "files": ["/data/questions.json", "/data/img/**"] }
}
```
 
- Avisar de versiones nuevas con `SwUpdate` (`VERSION_READY` → recargar).
- En iPhone no hay aviso automático de instalación: mostrar un mensaje si es iOS y no está en modo standalone (`matchMedia('(display-mode: standalone)')`).
- El service worker solo funciona en build de producción: probar con `ng build` + `npx http-server dist/<app>/browser`.
## Avisos (pantalla "Acerca de" + una línea al pie del inicio)
 
- Privacidad: "No recogemos datos personales. Tu progreso se guarda solo en tu dispositivo." Sin banner de cookies (solo `localStorage` funcional). Si se añade analítica, que sea sin cookies (p. ej. Vercel Analytics).
- No oficial: "Proyecto de estudio sin relación con la DGT ni con ninguna administración."
- Contenido: "Las preguntas proceden de exámenes oficiales anteriores. La normativa cambia y puede haber preguntas desactualizadas o errores. Ante la duda, consulta el temario oficial."
- Contacto o botón "reportar error".
## Fuentes de exámenes
 
- Exámenes propios (4, de Castilla y León): base principal.
- Generalitat Valenciana publica cuadernillos y plantillas oficiales (Mercancías y Viajeros, 2017–2024): https://mediambient.gva.es/es/web/transportes/preguntas-examen
- El temario es nacional (RD 284/2021), así que sirven exámenes de otras comunidades.
- Usar solo exámenes oficiales (no bancos de academias). Descargar solo la modalidad que corresponda (Mercancías o Viajeros).
## Riesgos y pendientes
 
- Calidad de los datos: revisar respuestas y temas; botón "reportar error" en cada pregunta.
- Exportar/importar el progreso (JSON), porque sin backend se pierde al borrar datos o cambiar de móvil.
- Pendiente: procesar los 4 exámenes oficiales + hojas de respuestas → `questions.json` (deduplicar, clasificar por tema, explicaciones).
- Pendiente: elegir nombre definitivo y modalidad (Mercancías o Viajeros).
