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

      const doc = document.documentElement;
      const winScroll = doc.scrollTop || document.body.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      this._readingProgress.set(height > 0 ? (winScroll / height) * 100 : 0);

      const probe = window.scrollY + 280;
      let current: string | null = null;

      for (const id of UiChromeService.SECTION_IDS) {
        const el = this.resolveSectionElement(id);
        if (!el) continue;
        const top = el.offsetTop;
        if (probe >= top && probe < top + el.offsetHeight) {
          current = id;
          break;
        }
      }

      this._activeSection.set(current);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      this.readingFrame = requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    this.readingScrollListener = onScroll;
    measure();
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
