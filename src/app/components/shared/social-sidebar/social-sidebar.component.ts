import { Component, EventEmitter, Inject, Input, Output, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export const STARDUST_STORAGE_KEY = 'expojuy-stardust';

interface SocialLink {
  label: string;
  url: string;
  icon: string;
}

const HINT_SEEN_KEY = 'expojuy-social-hint-seen';
const LONG_PRESS_MS = 450;
const HINT_VISIBLE_MS = 3200;

/** Invitación a explorar el menú flotante. Se muestra una vez por sesión. */
const BUBBLE_SEEN_KEY = 'expojuy-social-bubble-seen';
const BUBBLE_DELAY_MS = 4500;

@Component({
  selector: 'app-social-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-sidebar.component.html',
  styleUrls: ['./social-sidebar.component.css']
})
export class SocialSidebarComponent implements OnInit, OnDestroy {
  @Input() public stardustEnabled = true;
  @Output() public stardustToggle = new EventEmitter<boolean>();

  // Signals, no campos booleanos: la app corre sin zone.js (zoneless), asi que
  // una asignacion dentro de un setTimeout no dispara deteccion de cambios.
  public readonly isOpen = signal(false);
  public readonly showHint = signal(false);
  public readonly showBubble = signal(false);

  public socials: SocialLink[] = [
    { label: 'Instagram', url: 'https://www.instagram.com/expojuy/', icon: 'instagram' },
    { label: 'Facebook', url: 'https://www.facebook.com/ExpoJuy/', icon: 'facebook' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/company/expojuy', icon: 'linkedin' }
  ];

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private bubbleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.stardustEnabled = true;
    try {
      localStorage.setItem(STARDUST_STORAGE_KEY, 'true');
    } catch {}
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) {
      this.maybeShowHintOnce();
    }
    this.scheduleBubble();
  }

  ngOnDestroy(): void {
    this.clearLongPress();
    this.clearHide();
    this.clearBubble();
  }

  public toggleMenu(): void {
    this.isOpen.update((v) => !v);
    // Abrir el menú ya cumplió el objetivo de la burbuja: no debe volver.
    if (this.isOpen()) {
      this.dismissBubble();
    }
  }

  /** Cierre manual con la X. También marca la burbuja como vista. */
  public dismissBubble(): void {
    this.clearBubble();
    this.showBubble.set(false);
    this.markBubbleSeen();
  }

  public toggleStardust(): void {
    this.stardustEnabled = !this.stardustEnabled;
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STARDUST_STORAGE_KEY, String(this.stardustEnabled));
      } catch {}
    }
    this.stardustToggle.emit(this.stardustEnabled);
  }

  /** Pulsación larga: en táctil es la única forma de descubrir la ayuda. */
  public onFabPressStart(event: PointerEvent): void {
    if (event.pointerType === 'mouse') return;
    this.clearLongPress();
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      this.revealHint();
    }, LONG_PRESS_MS);
  }

  public onFabPressEnd(): void {
    this.clearLongPress();
  }

  private maybeShowHintOnce(): void {
    let seen = false;
    try {
      seen = localStorage.getItem(HINT_SEEN_KEY) === '1';
    } catch {}
    if (seen) return;
    this.revealHint();
    try {
      localStorage.setItem(HINT_SEEN_KEY, '1');
    } catch {}
  }

  private revealHint(): void {
    this.showHint.set(true);
    this.clearHide();
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      this.showHint.set(false);
    }, HINT_VISIBLE_MS);
  }

  /**
   * La burbuja aparece sola a los ~4,5 s para no competir con el contenido
   * inicial, y solo una vez por sesión (sessionStorage): si el usuario navega
   * por la SPA no vuelve a interrumpirle.
   */
  private scheduleBubble(): void {
    if (this.readSessionFlag(BUBBLE_SEEN_KEY)) return;
    this.bubbleTimer = setTimeout(() => {
      this.bubbleTimer = null;
      this.showBubble.set(true);
      this.markBubbleSeen();
    }, BUBBLE_DELAY_MS);
  }

  private readSessionFlag(key: string): boolean {
    try {
      return sessionStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }

  private markBubbleSeen(): void {
    try {
      sessionStorage.setItem(BUBBLE_SEEN_KEY, '1');
    } catch {}
  }

  private clearBubble(): void {
    if (this.bubbleTimer !== null) {
      clearTimeout(this.bubbleTimer);
      this.bubbleTimer = null;
    }
  }

  private clearLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private clearHide(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
