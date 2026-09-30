import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  effect,
  signal,
  viewChild
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { EjesComponent } from '../ejes/ejes.component';
import { UbicacionPredioHubComponent } from '../ubicacion-predio-hub/ubicacion-predio-hub';
import { ExpositoresComponent } from '../expositores/expositores.component';
import { AgendaComponent } from '../agenda/agenda.component';
import { NovedadesComponent } from '../publicaciones/publicaciones.component';
import { GaleriaComponent } from '../galeria/galeria.component';
import { AcreditacionesFaq } from '../acreditaciones-faq/acreditaciones-faq';
import { Sponsors } from '../sponsors/sponsors';
import { UiChromeService } from '../../../core/ui-chrome.service';
import { GsapBundle, loadGsap } from '../../../core/gsap-loader';
import { scheduleIdle } from '../../../core/idle';
import type Lenis from 'lenis';
import type * as ScrollTriggerTypes from 'gsap/ScrollTrigger';

type GsapTimeline = ReturnType<GsapBundle['gsap']['timeline']>;
type GsapTween = ReturnType<GsapBundle['gsap']['to']>;

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

/** Subconjunto de la API de Web Speech usada por el chatbot. */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start(): void;
  abort(): void;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    EjesComponent,
    UbicacionPredioHubComponent,
    ExpositoresComponent,
    AgendaComponent,
    NovedadesComponent,
    GaleriaComponent,
    AcreditacionesFaq,
    Sponsors
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit, AfterViewInit, OnDestroy {
  // ── View queries (signal based) ──────────────────────────────────────────
  private readonly bgVideo = viewChild<ElementRef<HTMLVideoElement>>('bgVideo');
  private readonly predioComponent = viewChild(UbicacionPredioHubComponent);
  private readonly splashNode = viewChild<ElementRef<HTMLElement>>('splashNode');
  private readonly splashLogo = viewChild<ElementRef<HTMLElement>>('splashLogo');
  private readonly splashBadge = viewChild<ElementRef<HTMLElement>>('splashBadge');
  private readonly heroSection = viewChild<ElementRef<HTMLElement>>('heroSection');
  private readonly heroBg = viewChild<ElementRef<HTMLElement>>('heroBg');
  private readonly chatMessagesBox = viewChild<ElementRef<HTMLDivElement>>('chatMessagesBox');
  private readonly chatInputField = viewChild<ElementRef<HTMLInputElement>>('chatInputField');

  // ── Estado de UI (consumido por la plantilla) ───────────────────────────
  readonly splashVisible = signal(true);
  readonly countdown = signal({ days: '30', hours: '00', minutes: '00', seconds: '00' });
  readonly chatOpen = signal(false);
  readonly chatTyping = signal(false);
  readonly chatDraft = signal('');
  readonly chatMessages = signal<ChatMessage[]>([
    { sender: 'bot', text: '¡Hola! Soy PachAI, tu asistente virtual de ExpoJuy 2026. ¿En qué puedo ayudarte hoy?' }
  ]);

  // ── Recursos con teardown ───────────────────────────────────────────────
  // GSAP y Lenis se resuelven con `import()` en `ngAfterViewInit`: son ~90 kB
  // que antes formaban parte del bundle inicial. Los tipos vienen de
  // `import type`, que el compilador borra por completo.
  private gsap!: GsapBundle['gsap'];
  private ScrollTrigger!: GsapBundle['ScrollTrigger'];
  private LenisCtor: typeof Lenis | null = null;
  private lenisInstance: Lenis | null = null;
  private lenisScrollUnsubscribe: (() => void) | null = null;
  private gsapTickerFn: ((time: number) => void) | null = null;
  private chromeScrollHandler: ((target: string) => void) | null = null;
  private splashTimeline: GsapTimeline | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private readonly tweens: GsapTween[] = [];
  private readonly scrollTriggers: ScrollTriggerTypes.ScrollTrigger[] = [];
  private readonly observers: IntersectionObserver[] = [];
  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();
  private readonly typingTimers = new Set<ReturnType<typeof setTimeout>>();
  private readonly idleCancels = new Set<() => void>();
  private chatScrollFrame: number | null = null;
  private videoSourceAttached = false;
  private readonly rafIds = new Set<number>();
  private readonly listenerCleanups: Array<() => void> = [];
  private activeRecognition: SpeechRecognitionLike | null = null;
  private bodyScrollLocked = false;
  private viewDestroyed = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private chrome: UiChromeService
  ) {
    // Autoscroll del hilo cuando llega un mensaje nuevo o el indicador de typing.
    effect(() => {
      this.chatMessages();
      this.chatTyping();

      if (typeof requestAnimationFrame !== 'function') return;
      if (this.chatScrollFrame !== null) cancelAnimationFrame(this.chatScrollFrame);

      this.chatScrollFrame = requestAnimationFrame(() => {
        this.chatScrollFrame = null;
        const box = this.chatMessagesBox()?.nativeElement;
        if (box) box.scrollTop = box.scrollHeight;
      });
    });

    // La clase vive en <body> porque el CSS de la barra lateral tambien la consulta.
    effect(() => {
      if (typeof document === 'undefined') return;
      document.body.classList.toggle('chat-open', this.chatOpen());
    });
  }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.onIdle(() => void this.initAnimations(), 600);
  }

  private onIdle(fn: () => void, timeoutMs: number): void {
    const cancel = scheduleIdle(() => {
      this.idleCancels.delete(cancel);
      fn();
    }, timeoutMs);
    this.idleCancels.add(cancel);
  }

  private async initAnimations(): Promise<void> {
    try {
      const [{ gsap, ScrollTrigger }, lenisModule] = await Promise.all([
        loadGsap(),
        import('lenis')
      ]);

      if (this.viewDestroyed) return;

      this.gsap = gsap;
      this.ScrollTrigger = ScrollTrigger;
      this.LenisCtor = (lenisModule.default ?? lenisModule) as typeof Lenis;

      this.initSplashIntro();
      this.iniciarVideoFondo();
      this.revealHeroLayers();
      this.initCountdown();
      this.initTextEffects();

      this.scheduleEnhancements();
    } catch (error) {
      console.error('[inicio] No se pudieron cargar las animaciones', error);
      this.dismissSplash();
      this.revealHeroLayersStatic();
      this.iniciarVideoFondo();
      this.initCountdown();
      this.initTextEffectsStatic();
    }
  }

  private scheduleEnhancements(): void {
    this.onIdle(() => {
      if (this.viewDestroyed) return;
      this.initLenisSmoothScroll();
      this.initHeroParallax();
      this.initScrollReveal();
    }, 1200);
  }

  private dismissSplash(): void {
    this.splashVisible.set(false);
    this.releaseBodyScrollLock();
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  ngOnDestroy(): void {
    this.viewDestroyed = true;

    if (this.chromeScrollHandler) {
      this.chrome.unregisterScrollHandler(this.chromeScrollHandler);
      this.chromeScrollHandler = null;
    }

    if (this.gsapTickerFn && this.gsap) {
      this.gsap.ticker.remove(this.gsapTickerFn);
      this.gsapTickerFn = null;
    }

    this.lenisScrollUnsubscribe?.();
    this.lenisScrollUnsubscribe = null;
    this.lenisInstance?.destroy();
    this.lenisInstance = null;

    this.splashTimeline?.kill();
    this.splashTimeline = null;

    this.clearCountdown();

    for (const tween of this.tweens) tween.kill();
    this.tweens.length = 0;

    for (const trigger of this.scrollTriggers) trigger.kill();
    this.scrollTriggers.length = 0;

    for (const observer of this.observers) observer.disconnect();
    this.observers.length = 0;

    for (const timeout of this.timeouts) clearTimeout(timeout);
    this.timeouts.clear();

    for (const timer of this.typingTimers) clearTimeout(timer);
    this.typingTimers.clear();

    for (const rafId of this.rafIds) cancelAnimationFrame(rafId);
    this.rafIds.clear();

    if (this.chatScrollFrame !== null) cancelAnimationFrame(this.chatScrollFrame);
    this.chatScrollFrame = null;

    for (const cancel of this.idleCancels) cancel();
    this.idleCancels.clear();

    for (const cleanup of this.listenerCleanups) cleanup();
    this.listenerCleanups.length = 0;

    this.activeRecognition?.abort();
    this.activeRecognition = null;

    this.releaseBodyScrollLock();
    document.body.classList.remove('chat-open');
  }

  // =========================================================================
  // SPLASH INTRO & VIDEO DE FONDO
  // =========================================================================
  private initSplashIntro(): void {
    const splash = this.splashNode()?.nativeElement;
    const logo = this.splashLogo()?.nativeElement;
    const badge = this.splashBadge()?.nativeElement;

    if (!splash || !logo) {
      this.splashVisible.set(false);
      this.revealHeroLayers();
      return;
    }

    this.lockBodyScroll();

    const timeline = this.gsap.timeline({
      onComplete: () => {
        this.splashVisible.set(false);
        this.releaseBodyScrollLock();

        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        this.lenisInstance?.scrollTo(0, { immediate: true });

        this.ScrollTrigger.refresh();
        this.revealHeroLayers();
      }
    });
    this.splashTimeline = timeline;

    timeline.to(logo, {
      opacity: 1,
      scale: 1,
      duration: 0.6,
      ease: 'back.out(1.7)'
    });

    if (badge) {
      timeline.to(badge, {
        opacity: 0,
        y: 10,
        duration: 0.3,
        delay: 0.3
      });
    }

    timeline
      .to(logo, {
        scale: 6,
        opacity: 0,
        filter: 'blur(16px)',
        duration: 0.6,
        ease: 'expo.in'
      }, 'zoom')
      .to(splash, {
        opacity: 0,
        duration: 0.45,
        ease: 'power2.out'
      }, 'zoom+=0.1');
  }

  private lockBodyScroll(): void {
    this.bodyScrollLocked = true;
    document.body.style.overflow = 'hidden';
  }

  private releaseBodyScrollLock(): void {
    if (!this.bodyScrollLocked) return;
    this.bodyScrollLocked = false;
    document.body.style.overflow = '';
  }

  private clearCountdown(): void {
    if (this.countdownInterval === null) return;
    clearInterval(this.countdownInterval);
    this.countdownInterval = null;
  }

  private iniciarVideoFondo(): void {
    const video = this.bgVideo()?.nativeElement;
    if (!video || this.videoSourceAttached) return;
    this.videoSourceAttached = true;

    video.muted = true;
    video.defaultMuted = true;

    const play = () => {
      video.play().catch(() => {
        const resumeOnFirstGesture = () => {
          window.removeEventListener('click', resumeOnFirstGesture);
          video.play().catch(() => { /* el navegador puede seguir bloqueandolo */ });
        };
        window.addEventListener('click', resumeOnFirstGesture, { once: true });
        this.listenerCleanups.push(() => window.removeEventListener('click', resumeOnFirstGesture));
      });
    };

    const attachSource = () => {
      if (this.viewDestroyed) return;
      video.src = './img/video_fondo.mp4';
      video.load();
      play();
    };
    this.onIdle(attachSource, 2500);
  }

  // =========================================================================
  // LENIS SMOOTH SCROLL
  // =========================================================================

  private initLenisSmoothScroll(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const LenisCtor = this.LenisCtor;
    if (!LenisCtor) return;

    const lenis = new LenisCtor({
      duration: 0.85,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.0,
      infinite: false
    });
    this.lenisInstance = lenis;

    // `lenis.on` devuelve la funcion de baja: no hace falta `off` ni busquedas.
    this.lenisScrollUnsubscribe = lenis.on('scroll', (instance) => {
      if (instance.animatedScroll <= 0) {
        window.scrollTo(0, 0);
      }
      this.ScrollTrigger.update();
    });

    this.gsapTickerFn = (time: number) => lenis.raf(time * 1000);
    this.gsap.ticker.add(this.gsapTickerFn);
    this.gsap.ticker.lagSmoothing(0);

    // El menu movil del header (persistente, fuera de esta ruta) navega
    // mediante el servicio: asi el smooth scroll tiene un unico dueno.
    this.chromeScrollHandler = (target: string) => this.smoothScrollTo(target);
    this.chrome.registerScrollHandler(this.chromeScrollHandler);
  }

  /** Los CTA del hero usan el mismo scroll que el rail y el menu movil. */
  onAnchorClick(event: Event, target: string): void {
    event.preventDefault();
    this.smoothScrollTo(target);
  }

  private smoothScrollTo(target: string, options?: { offset?: number; duration?: number }): void {
    const opts = options ?? {};
    const id = target.replace(/^#/, '');

    let el: HTMLElement | null = null;

    if (id === 'mapa' || id === 'ubicacion') {
      const predio = this.predioComponent();
      if (predio) {
        predio.switchTab(id === 'ubicacion' ? 'ubicacion' : 'predio');
        el = predio.host.nativeElement;
      }
    } else if (id === 'hero-section') {
      el = this.heroSection()?.nativeElement ?? null;
    }

    el = el ?? this.chrome.resolveSectionElement(id);
    if (!el) return;

    if (this.lenisInstance) {
      this.lenisInstance.scrollTo(el, {
        offset: typeof opts.offset === 'number' ? opts.offset : -76,
        duration: typeof opts.duration === 'number' ? opts.duration : 1.1
      });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // =========================================================================
  // HERO LAYERS & PARALLAX
  // =========================================================================
  private revealHeroLayers(): void {
    const layers = Array.from(
      this.heroSection()?.nativeElement.querySelectorAll<HTMLElement>('.hero-layer') ?? []
    );
    if (!layers.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      layers.forEach(l => {
        l.style.opacity = '1';
        l.style.visibility = 'visible';
        l.style.transform = '';
      });
      return;
    }

    this.gsap.set(layers, { opacity: 0, y: 40, visibility: 'hidden' });
    this.tweens.push(this.gsap.to(layers, {
      opacity: 1,
      y: 0,
      visibility: 'visible',
      duration: 0.6,
      delay: 0.2,
      stagger: 0.15,
      ease: 'expo.out',
      overwrite: true,
      clearProps: 'opacity,transform,visibility'
    }));
  }

  private revealHeroLayersStatic(): void {
    this.heroSection()?.nativeElement
      .querySelectorAll<HTMLElement>('.hero-layer')
      .forEach(l => {
        l.style.opacity = '1';
        l.style.visibility = 'visible';
        l.style.transform = '';
      });
  }


  private initTextEffectsStatic(): void {
    document.querySelectorAll<HTMLElement>('.count-up').forEach(el => {
      el.textContent = (parseFloat(el.dataset['count'] || '0')) + (el.dataset['suffix'] || '');
    });

    document.querySelectorAll<HTMLElement>('.reveal-on-scroll').forEach(el => {
      el.classList.add('is-visible');
    });
  }

  private initHeroParallax(): void {
    const bg = this.heroBg()?.nativeElement;
    if (!bg) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tween = this.gsap.fromTo(bg,
      { y: 0 },
      {
        y: -80,
        ease: 'none',
        scrollTrigger: {
          trigger: this.heroSection()?.nativeElement ?? bg,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6
        }
      }
    );

    this.tweens.push(tween);
    if (tween.scrollTrigger) this.scrollTriggers.push(tween.scrollTrigger);
  }

  // =========================================================================
  // SCROLL REVEAL (INTERSECTION OBSERVER)
  // =========================================================================
  private initScrollReveal(): void {
    // Timeout breve para que componentes como Ejes carguen sus datos.
    const timeout = setTimeout(() => {
      this.timeouts.delete(timeout);

      const reveals = document.querySelectorAll('.reveal-on-scroll');
      if (!reveals.length) {
        this.ScrollTrigger.refresh();
        return;
      }

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          });
        }, {
          threshold: 0.05,
          rootMargin: '50px 0px 0px 0px'
        });

        reveals.forEach(el => observer.observe(el));
        this.observers.push(observer);
      } else {
        reveals.forEach(el => el.classList.add('is-visible'));
      }

      this.ScrollTrigger.refresh();
    }, 300);

    this.timeouts.add(timeout);
  }

  // =========================================================================
  // COUNTDOWN TIMER
  // =========================================================================
  private initCountdown(): void {
    const targetDate = new Date('2026-10-09T09:00:00-03:00').getTime();

    const updateTimer = () => {
      const difference = targetDate - Date.now();

      if (difference <= 0) {
        this.countdown.set({ days: '00', hours: '00', minutes: '00', seconds: '00' });
        this.clearCountdown();
        return;
      }

      this.countdown.set({
        days: String(Math.floor(difference / 86400000)).padStart(2, '0'),
        hours: String(Math.floor((difference % 86400000) / 3600000)).padStart(2, '0'),
        minutes: String(Math.floor((difference % 3600000) / 60000)).padStart(2, '0'),
        seconds: String(Math.floor((difference % 60000) / 1000)).padStart(2, '0')
      });
    };

    updateTimer();
    this.countdownInterval = setInterval(updateTimer, 1000);
  }

  // =========================================================================
  // COUNTUP & BLURTEXT
  // =========================================================================
  private initTextEffects(): void {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const counters = Array.from(document.querySelectorAll<HTMLElement>('.count-up'));
    if (counters.length) {
      if (reduced) {
        counters.forEach(el => {
          el.textContent = (parseFloat(el.dataset['count'] || '0')) + (el.dataset['suffix'] || '');
        });
      } else if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target as HTMLElement;
            const target = parseFloat(el.dataset['count'] || '0');
            const suffix = el.dataset['suffix'] || '';
            const duration = 1200;
            const start = performance.now();

            const step = (now: number) => {
              this.rafIds.delete(frame);
              const p = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - p, 3);
              el.textContent = Math.round(target * eased) + suffix;
              if (p < 1) {
                const next = requestAnimationFrame(step);
                this.rafIds.add(next);
              }
            };

            const frame = requestAnimationFrame(step);
            this.rafIds.add(frame);
            io.unobserve(el);
          });
        }, { threshold: 0.4 });

        counters.forEach(el => io.observe(el));
        this.observers.push(io);
      }
    }

    if (reduced) return;

    document.querySelectorAll<HTMLElement>('.blur-split').forEach(h => {
      const text = (h.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;

      h.setAttribute('aria-label', text);
      h.textContent = '';
      const frag = document.createDocumentFragment();

      text.split(' ').forEach((word, wi) => {
        if (wi) frag.appendChild(document.createTextNode(' '));
        const wordSpan = document.createElement('span');
        wordSpan.className = 'bs-word';
        wordSpan.style.display = 'inline-block';
        for (const ch of word) {
          const s = document.createElement('span');
          s.className = 'bs-char';
          s.style.display = 'inline-block';
          s.style.willChange = 'transform, filter';
          s.style.whiteSpace = 'pre';
          s.textContent = ch;
          wordSpan.appendChild(s);
        }
        frag.appendChild(wordSpan);
      });
      h.appendChild(frag);

      const chars = h.querySelectorAll('.bs-char');
      if (!('IntersectionObserver' in window)) return;

      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          this.tweens.push(this.gsap.fromTo(chars,
            { opacity: 0, y: '0.5em', filter: 'blur(10px)' },
            {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 0.9,
              ease: 'power3.out',
              stagger: 0.018,
              clearProps: 'filter'
            }
          ));
          io.disconnect();
        });
      }, { threshold: 0.25 });

      io.observe(h);
      this.observers.push(io);
    });
  }

  // =========================================================================
  // PACHAI CHATBOT FLOTANTE
  // =========================================================================
  toggleChatbot(): void {
    const next = !this.chatOpen();
    this.chatOpen.set(next);
    if (next) {
      this.chatInputField()?.nativeElement.focus();
    }
  }

  closeChatbot(): void {
    this.chatOpen.set(false);
  }

  sendChatMessage(event: Event): void {
    event.preventDefault();
    this.submitChatDraft();
  }

  updateChatDraft(value: string): void {
    this.chatDraft.set(value);
  }

  private submitChatDraft(text?: string): void {
    const message = (text ?? this.chatDraft()).trim();
    if (!message) return;

    this.chatMessages.update(messages => [...messages, { sender: 'user', text: message }]);
    this.chatDraft.set('');
    this.chatTyping.set(true);

    const timer = setTimeout(() => {
      this.typingTimers.delete(timer);
      this.chatTyping.set(false);
      this.chatMessages.update(messages => [
        ...messages,
        { sender: 'bot', text: this.getBotReply(message) }
      ]);
    }, 750);

    this.typingTimers.add(timer);
  }

  toggleVoiceInput(): void {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      this.chatMessages.update(messages => [
        ...messages,
        { sender: 'bot', text: 'Tu navegador no soporta reconocimiento de voz nativo. Por favor escribe tu consulta.' }
      ]);
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'es-AR';
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.chatDraft.set(transcript);
        this.submitChatDraft(transcript);
      };
      this.activeRecognition = recognition;
      recognition.start();
    } catch {
      this.chatMessages.update(messages => [
        ...messages,
        { sender: 'bot', text: 'No se pudo activar el micrófono. Puedes escribir tu consulta directamente.' }
      ]);
    }
  }

  private getBotReply(text: string): string {
    const lower = text.toLowerCase();

    if (/litio|miner[ií]a|bater[ií]a/.test(lower)) {
      return 'El rubro de Minería y Litio está dentro del listado de "Expositores" (podés activar su filtro) y además cuenta con disertaciones propias en la Agenda.';
    }
    if (/entrada|acredit|ticket|precio|costo/.test(lower)) {
      return 'El acceso general no tiene costo: solo tenés que llenar el formulario que está en "Contacto" y vas a recibir tu credencial digital por correo antes del evento.';
    }
    if (/d[oó]nde|ubicaci[oó]n|lugar|predio|llegar|mapa/.test(lower)) {
      return 'La feria se lleva a cabo en el Predio Ferial de San Salvador de Jujuy (Ciudad Cultural). En la sección "Mapa" encontrás el plano 3D de los pabellones y la ubicación en mapa interactivo.';
    }
    if (/fecha|cu[aá]ndo/.test(lower)) {
      return 'ExpoJuy 2026 tiene lugar del 9 al 18 de octubre de 2026 en el Predio Ferial de la Ciudad Cultural de San Salvador de Jujuy.';
    }
    if (/agenda|charla|conferencia|actividad|horario/.test(lower)) {
      return 'Dentro de "Agenda" vas a ver pestañas ordenadas por día y filtros de actividad. También podés guardar las charlas que te interesan con el botón de "Avisarme".';
    }
    if (/expositor|empresa|stand/.test(lower)) {
      return 'En "Expositores" podés buscar por nombre o filtrar por rubro con carga continua inteligente sin límite de páginas.';
    }
    if (/gracias/.test(lower)) {
      return '¡Con gusto! Si tenés otra consulta, estoy a tu disposición para ayudarte.';
    }

    return 'Te puedo ayudar con expositores, agenda, ubicación del predio o acreditaciones. ¿Querés que profundicemos en alguno de esos temas?';
  }
}
