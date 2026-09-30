import { Injectable, signal } from '@angular/core';

/**
 * Estado compartido del "chrome" del portal (header + barra de lectura).
 *
 * Antes estos valores vivian manipulados desde `InicioComponent` con
 * `document.getElementById` y `classList`, lo que obligaba al componente de
 * inicio a reaches los nodos de `HeaderComponent` y `PortalLayoutComponent`.
 * Al vivir en el header (que es persistente), cada visita a `/` volvia a
 * registrar listeners sobre los mismos nodos y los eventos se duplicaban.
 *
 * Ahora el estado es un signal y cada plantilla consume sus propios bindings.
 */
@Injectable({ providedIn: 'root' })
export class UiChromeService {
  private static readonly THEME_STORAGE_KEY = 'expojuy-theme';

  /** Secciones que se resaltan en el rail lateral y en la nav del header. */
  private static readonly SECTION_IDS = [
    'hero-section',
    'sobre-expojuy',
    'mapa',
    'expositores',
    'agenda',
    'novedades',
    'galeria',
    'acreditaciones-section'
  ] as const;

  /** Elementos de seccion ya resueltos, para no consultar el DOM por frame. */
  private readonly sectionElements = new Map<string, HTMLElement | null>();

  // ── Tema ────────────────────────────────────────────────────────────────
  private readonly _darkMode = signal(false);
  readonly darkMode = this._darkMode.asReadonly();

  // ── Menú móvil ──────────────────────────────────────────────────────────
  private readonly _mobileMenuOpen = signal(false);
  readonly mobileMenuOpen = this._mobileMenuOpen.asReadonly();

  // ── Indicadores de scroll ───────────────────────────────────────────────
  private readonly _activeSection = signal<string | null>(null);
  readonly activeSection = this._activeSection.asReadonly();

  private readonly _readingProgress = signal(0);
  readonly readingProgress = this._readingProgress.asReadonly();

  /**
   * Smooth scroll delegado. `InicioComponent` lo registra porque es quien
   * posee la instancia de Lenis; asi el menu movil del header puede navegar
   * sin depender de un global en `window`.
   */
  private scrollHandler: ((target: string) => void) | null = null;

  private readingScrollListener: (() => void) | null = null;
  /** Frame pendiente de medicion; se cancela al detener el tracker. */
  private readingFrame: number | null = null;

  /**
   * Sincroniza el signal con la clase `dark` que el script anti-flicker de
   * `index.html` ya aplico sobre `<html>`, para no provocar un parpadeo.
   */
  initTheme(): void {
    if (typeof document === 'undefined') return;
    this._darkMode.set(document.documentElement.classList.contains('dark'));
  }

  toggleTheme(): void {
    if (typeof document === 'undefined') return;

    const isDark = !this._darkMode();
    this._darkMode.set(isDark);
    document.documentElement.classList.toggle('dark', isDark);

    try {
      localStorage.setItem(UiChromeService.THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Modo privado / storage bloqueado: el tema sigue funcionando en memoria.
    }
  }

  setMobileMenu(open: boolean): void {
    this._mobileMenuOpen.set(open);
  }

  toggleMobileMenu(): void {
    this._mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this._mobileMenuOpen.set(false);
  }

  /** Registra el proveedor de smooth scroll (Lenis). */
  registerScrollHandler(handler: (target: string) => void): void {
    this.scrollHandler = handler;
  }

  unregisterScrollHandler(handler: (target: string) => void): void {
    if (this.scrollHandler === handler) {
      this.scrollHandler = null;
    }
  }

  /** Navega a un ancla usando Lenis si esta disponible; si no, via nativa. */
  scrollTo(target: string): void {
    if (this.scrollHandler) {
      this.scrollHandler(target);
      return;
    }

    const el = this.resolveSectionElement(target.replace(/^#/, ''));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Resuelve un id de seccion a su elemento. La mayoria de las secciones viven
   * dentro de componentes hijos, asi que la busqueda se centraliza aqui en lugar
   * de repetir `document.getElementById` en cada componente.
   */
  resolveSectionElement(id: string): HTMLElement | null {
    if (typeof document === 'undefined' || !id) return null;
    return document.getElementById(id);
  }

  /**
   * Igual que `resolveSectionElement` pero recuerda el elemento. El tracker de
   * lectura interroga las ocho secciones en cada frame de scroll; resolverlas de
   * nuevo cada vez eran ocho `getElementById` por frame. `isConnected` mantiene
   * la cache al dia cuando Angular destruye y recrea una seccion al navegar.
   */
  private resolveCachedSection(id: string): HTMLElement | null {
    const cached = this.sectionElements.get(id);
    if (cached && cached.isConnected) return cached;
    const el = this.resolveSectionElement(id);
    this.sectionElements.set(id, el);
    return el;
  }

  /**
   * Clic en un enlace del menu movil: navega con scroll suave y cierra el menu.
   * El `preventDefault` se aplica siempre para no duplicar el salto del ancla.
   */
  onMobileNavClick(event: Event, href: string): void {
    event.preventDefault();
    this.closeMobileMenu();

    if (href && href.startsWith('#')) {
      this.scrollTo(href);
    }
  }

  /**
   * Registra el listener de scroll que alimenta la barra de lectura y el
   * resaltado de seccion. Es idempotente para no duplicar eventos si se
   * llama mas de una vez.
   */
  startReadingTracker(): void {
    if (typeof window === 'undefined' || this.readingScrollListener) return;

    // El scroll se dispara a una frecuencia mayor que la de pintado. Se escucha
    // en modo barato (solo marca que hay trabajo pendiente) y se mide una vez
    // por frame: asi no se fuerzan varios layouts por segundo.
    let ticking = false;

    const measure = () => {
      ticking = false;
      if (typeof document === 'undefined') return;

      // Todas las lecturas de geometria ocurren aqui, antes de tocar ninguna
      // senal: si se mezclaran escrituras, cada lectura invalidaria el layout
      // pendiente y el navegador recalcularia el documento en el mismo frame.
      const doc = document.documentElement;
      const winScroll = doc.scrollTop || document.body.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      const progress = height > 0 ? (winScroll / height) * 100 : 0;

      const probe = window.scrollY + 280;
      let current: string | null = null;

      for (const id of UiChromeService.SECTION_IDS) {
        const el = this.resolveCachedSection(id);
        if (!el) continue;
        const top = el.offsetTop;
        if (probe >= top && probe < top + el.offsetHeight) {
          current = id;
          break;
        }
      }

      // Escrituras al final, ya sin lecturas pendientes que invalidar.
      this._readingProgress.set(progress);
      this._activeSection.set(current);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      this.readingFrame = requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    this.readingScrollListener = onScroll;

    // La primera medicion se difiere a idle para no obligar al navegador a resolver
    // estilos/geometria de forma sincrona durante el arranque inicial (elimina forced reflow).
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        if (this.readingScrollListener) {
          this.readingFrame = requestAnimationFrame(measure);
        }
      }, { timeout: 2500 });
    } else {
      setTimeout(() => {
        if (this.readingScrollListener) {
          this.readingFrame = requestAnimationFrame(measure);
        }
      }, 500);
    }
  }

  stopReadingTracker(): void {
    if (this.readingFrame !== null) {
      cancelAnimationFrame(this.readingFrame);
      this.readingFrame = null;
    }
    if (!this.readingScrollListener) return;
    window.removeEventListener('scroll', this.readingScrollListener);
    this.readingScrollListener = null;
  }
}
