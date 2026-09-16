# Bitácora de Migración: ExpoJuy 2026 a Angular 21

**Proyecto Origen:** HTML5 / Vanilla JS / Tailwind CSS CDN / Three.js r128 / Leaflet / GSAP 3.12 / Lenis 1.1  
**Proyecto Destino:** Angular 21.2 (Standalone Components) / TypeScript 5.9 / Tailwind CSS v4 (`@tailwindcss/postcss`) / `ngx-infinite-scroll`  
**Fecha de Migración:** 15 de Septiembre de 2026  
**Responsable:** Ingeniero Frontend Senior  

---

## 1. Animaciones Migradas 1:1

Las siguientes animaciones y transiciones se conservaron con fidelidad visual e interactiva idéntica a la versión original:

1. **Bento Grid Scrubbed Intro (`#bento-wrapper` & `#bento-stage`):**
   - Animación de dispersión con zoom radial (`scale: 4.8`) y difuminado progresivo (`filter: blur(12px)`) de las tarjetas de paisajes jujeños coordinada mediante timeline de GSAP (`bentoTL`) sincronizada con el scroll y fijación (`pin: stage`).
   - Desvanecimiento y zoom hacia la cámara del cartel central 3D de ExpoJuy.
   - Control táctil amortiguado en móviles (`touchstart`, `touchmove` con delta máximo de 35px) para evitar saltos bruscos hacia el Hero.
2. **Hero Background Parallax (`#hero-bg`):**
   - Desplazamiento vertical reactivo del video de fondo (`y: -80`) mediante `ScrollTrigger` con scrub suavizado (`scrub: 0.6`).
3. **Hero 3D Cursor Parallax Tracking (`.parallax-elem`):**
   - Seguimiento bidimensional del puntero del mouse sobre el Hero (`data-depth`) con interpolación de rotación y traslación en perspectiva (`translate3d` + `rotate`).
4. **Stardust Particles Canvas (`#stars-canvas`):**
   - 65 partículas celestiales y minerales flotantes reactivas a la inercia y velocidad del scroll del usuario con efectos de brillo y glow policromático (`#00C2D1`, `#9D4EDD`, `#5E3A8C`, `#B299D3`, `#FFFFFF`).
5. **Galería Acordeón Skiper 52 (`#accordion-gallery`):**
   - Expansión horizontal suave de tarjetas (`width: 0.3s easeInOut`) al interactuar con hover, foco o toque en pantallas móviles.
6. **Sponsors 3D Asynchronous Parallax Scroll (`#sponsors-section`):**
   - Desplazamiento con diferente inercia en 3 columnas asincrónicas (`col1: -650px`, `col2: -1020px`, `col3: -520px`) por delante y por detrás del encabezado sticky.
7. **Novedades Spotlight Effect (`.news-card`):**
   - Linterna radial interactiva (`--mouse-x`, `--mouse-y`) con `requestAnimationFrame` throttling.
8. **Efectos Tipográficos React-Bits (GSAP/CSS):**
   - **CountUp:** Contadores numéricos fluidos de métricas clave (500+, 15 países, 25.000 m², U$D 120M) mediante `IntersectionObserver`.
   - **BlurText Split:** Aparición letra por letra con desenfoque (`blur(10px) -> blur(0px)`) y elevación en títulos principales (`.blur-split`).
9. **Micro-interacciones en UI:**
   - Animaciones infinitas de Tailwind (`animate-marquee`, `animate-kenburns`, `animate-pulse-glow`, `animate-float-slow`) declaradas en `@theme` de Tailwind v4.
   - Efecto de oleaje simultáneo al seleccionar pases de acceso (`.pass-waving`).

---

## 2. Animaciones y Componentes Adaptados

Ciertas interacciones requirieron adaptaciones para garantizar compatibilidad con el ciclo de vida de Angular, SSR (Server-Side Rendering) y seguridad de plantillas:

1. **Gestión del Ciclo de Vida (`ngAfterViewInit` y `isPlatformBrowser`):**
   - *Causa:* En vanilla JS, los scripts se ejecutaban directamente al parsear el HTML o en `DOMContentLoaded`. En Angular, los elementos del DOM (`<canvas>`, contenedores de mapas y elementos con `@ViewChild`) no están disponibles hasta `ngAfterViewInit`. Asimismo, librerías como Three.js, Leaflet, Lenis y QR Canvas acceden a `window`, `document` y WebGL, lo que causaría fallos en entornos de renderizado del lado del servidor.
   - *Adaptación:* Se encapsuló toda la inicialización dentro de comprobaciones `isPlatformBrowser(this.platformId)` dentro de `ngAfterViewInit`. Se agregaron además destructores (`ngOnDestroy`) para liberar buffers de Three.js, matar tickers de GSAP y detener la instancia de Lenis.

2. **Reemplazo de Atributos de Evento Nativos (`onclick`, `oninput`, `onsubmit`):**
   - *Causa:* Angular prohíbe el uso de atributos HTML nativos `onclick="..."` por razones de seguridad (XSS) y detección de cambios.
   - *Adaptación:* Se sustituyeron por directivas de enlace de eventos canónicas de Angular (`(click)`, `(input)`, `(submit)`) vinculadas a métodos del componente (`App`), mientras que para elementos dinámicos o externos se mantuvieron bindings auxiliares en `(window as any)`.

3. **Escape de Llaves en Plantilla HTML (`{PLATINUM}`, `{MAIN DIAMOND}`, etc.):**
   - *Causa:* El compilador de Angular interpreta llaves simples `{...}` dentro del texto HTML como mensajes ICU (Internationalization Components Unit).
   - *Adaptación:* Se transformaron a entidades numéricas estándar `&#123;` y `&#125;`, manteniendo la presentación visual 1:1 sin alterar el marcado.

4. **Integración de `ngx-infinite-scroll` en la Grilla de Expositores:**
   - *Causa:* En el original existía una grilla con tarjetas estáticas y un filtrado que ocultaba nodos con `classList.add('hidden')`.
   - *Adaptación:* Se desacopló la visualización en un servicio reactivo `ExhibitorService` y un array dinámico de señales `exhibitors = signal<Exhibitor[]>([])`. La grilla utiliza `infiniteScroll` con `[infiniteScrollDistance]="2"` e `[infiniteScrollThrottle]="150"`, acumulando los expositores de manera asíncrona conforme el usuario scrollea, con skeleton de carga, control de fin de catálogo (`hasMore`) y banner de reintento ante fallos de red.

5. **Generador de Códigos QR (Sustitución de `qrcode.js` por `qrcode` npm):**
   - *Causa:* El script CDN `qrcode.js` original insertaba una tabla o imagen de baja resolución y requería scripts externos.
   - *Adaptación:* Se utiliza la librería tipada `qrcode` con renderizado directo sobre canvas (`QRCode.toCanvas()`), permitiendo mayor nitidez, control de paleta de colores (`#1A1226` / `#FFFFFF`) y regeneración instantánea al cambiar el nombre o el tipo de pase.

---

## 3. Librerías y Sustituciones

| Librería / Script Original | Dependencia / Solución en Angular | Motivo del Cambio |
| :--- | :--- | :--- |
| **Tailwind CSS CDN (`cdn.tailwindcss.com`)** | `@tailwindcss/postcss` + `tailwindcss` v4.1 | Eliminación de inyección dinámica en runtime del CDN. Configuración nativa con `@theme` en `styles.css`. |
| **GSAP 3 & ScrollTrigger (cdnjs CDN)** | `gsap` (npm `^3.12`) | Paquete npm formal con tipos TypeScript; sincronización directa con el ciclo de vida del componente. |
| **Three.js & OrbitControls (cdnjs / jsdelivr)** | `three` + `@types/three` | Importación modular ESM (`three/examples/jsm/controls/OrbitControls.js`); optimización en el bundle de producción. |
| **Lenis Smooth Scroll (`lenis@1.1.18` CDN)** | `lenis` (npm `^1.3`) | Integración tipada formal; sincronización con `gsap.ticker` y destrucción limpia en `ngOnDestroy`. |
| **Leaflet.js & CSS (unpkg CDN)** | `leaflet` + `@types/leaflet` + CDN CSS | Control del mapa reactivo con cambio dinámico de capas de teselas (CartoDB Voyager / Dark Matter) según el tema. |
| **QRCode.js (jsdelivr CDN)** | `qrcode` + `@types/qrcode` | Librería moderna basada en promesas y canvas con soporte completo para TypeScript. |
| **Boxicons (unpkg CDN)** | CDN / npm `boxicons` | Iconografía del asistente virtual PachAI cargada formalmente en `index.html`. |
| **Lista de Expositores Estática** | `ngx-infinite-scroll` (`^21.0.0`) + `ExhibitorService` | Carga incremental y paginada desde API simulada con señales de Angular, soporte de throttling y scroll infinito. |

---

## 4. Puntos de Revisión Manual

Los siguientes elementos interactivos deben ser verificados visualmente en runtime durante las pruebas de usuario o QA:

1. **Rendimiento WebGL del Master Plan 3D (`#masterplanCanvas`):**
   - Validar que en dispositivos de gama baja el canvas responda fluidamente (60 FPS) y que la interacción táctil con `OrbitControls` no interfiera con el scroll vertical de la página.
2. **PachAI Asistente Virtual:**
   - Verificar la apertura del diálogo flotante, el envío de consultas con respuestas contextuales en tiempo real y la compatibilidad del dictado por voz (Web Speech API) según el navegador utilizado.
3. **Carga Continua de Expositores (`ngx-infinite-scroll`):**
   - Comprobar que al desplazarse hacia la sección `#expositores` se disparen las cargas sucesivas de páginas de expositores sin dobles peticiones.
   - Validar que al escribir en el buscador o seleccionar un filtro de rubro (Minería, Agro, Energías, etc.) la grilla se reinicie correctamente y vuelva a permitir la carga infinita.
4. **Previsualización de Credencial QR y Pases:**
   - Comprobar que al alternar entre Pases (General, Full, Empresarial) y modalidades (Individual / Grupal) se actualicen los montos en pesos argentinos, la lista de beneficios y el código QR generado.
5. **Persistencia del Modo Oscuro:**
   - Validar que al presionar el botón de tema (`#theme-toggle`) cambie el mapa de Leaflet a su versión nocturna (`dark_all`), se inviertan las superficies y se almacene la preferencia en `localStorage('expojuy-theme')`.
