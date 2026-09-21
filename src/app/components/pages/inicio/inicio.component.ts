import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, ElementRef, ViewChild } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EjesComponent } from '../ejes/ejes.component';
import { UbicacionPredioHubComponent } from '../ubicacion-predio-hub/ubicacion-predio-hub';
import { ExpositoresComponent } from '../expositores/expositores.component';
import { AgendaComponent } from '../agenda/agenda.component';
import { NovedadesComponent } from '../novedades/novedades.component';
import { GaleriaComponent } from '../galeria/galeria.component';
import { Sponsors } from '../sponsors/sponsors';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import * as QRCode from 'qrcode';

interface PaseDetail {
  nombre: string;
  precioIndividual: number;
  precioGrupal: number;
  vigencia: string;
  beneficios: string[];
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EjesComponent,
    UbicacionPredioHubComponent,
    ExpositoresComponent,
    AgendaComponent,
    NovedadesComponent,
    GaleriaComponent,
    Sponsors
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgVideo') bgVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild(UbicacionPredioHubComponent) predioComponent!: UbicacionPredioHubComponent;

  private lenisInstance: Lenis | null = null;
  private countdownInterval: any = null;

  public paseActual = 'empresarial';
  public ticketType = 'individual';

  public chatMessages: Array<{ sender: 'user' | 'bot'; text: string }> = [
    { sender: 'bot', text: '¡Hola! Soy PachAI, tu asistente virtual de ExpoJuy 2026. ¿En qué puedo ayudarte hoy?' }
  ];

  public pasesData: Record<string, PaseDetail> = {
    general: {
      nombre: 'Pase General',
      precioIndividual: 5000,
      precioGrupal: 4000,
      vigencia: 'Acceso 1 Día',
      beneficios: [
        'Acceso libre a pabellones de expositores',
        'Ingreso a patio gastronómico y espectáculos',
        'Credencial digital con código QR'
      ]
    },
    empresarial: {
      nombre: 'Pase Ejecutivo',
      precioIndividual: 12000,
      precioGrupal: 9500,
      vigencia: 'Acceso Full Evento (10 días)',
      beneficios: [
        'Acceso prioritario sin filas a todos los pabellones',
        'Ingreso al Lounge VIP y área de Coworking',
        'Participación en Rondas de Negocios',
        'Catálogo digital de Expositores con contactos directos'
      ]
    },
    vip: {
      nombre: 'Pase VIP / Summit',
      precioIndividual: 25000,
      precioGrupal: 20000,
      vigencia: 'Acceso Total + Conferencias',
      beneficios: [
        'Todos los beneficios del Pase Ejecutivo',
        'Asiento reservado en Conferencias Plenarias y Summits',
        'Cocktail exclusivo de Apertura y Networking',
        'Estacionamiento preferencial dentro del predio'
      ]
    }
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.scrollTo(0, 0);
    gsap.registerPlugin(ScrollTrigger);

    this.bindWindowGlobals();
    this.initSplashIntro();
    this.iniciarVideoFondo();
    this.initLenisSmoothScroll();
    this.initHeroParallax();
    this.revealHeroLayers();
    this.initHeroCursorParallax();
    this.initReadingProgressBar();
    this.initScrollReveal();
    this.initCountdown();
    this.initDarkMode();
    this.initMobileMenu();
    this.initEntradasAndQr();
    this.initTextEffects();
    this.initChatbot();

    setTimeout(() => {
      this.selectPase('empresarial');
    }, 200);
  }

  ngOnDestroy(): void {
    if (this.lenisInstance) {
      this.lenisInstance.destroy();
      this.lenisInstance = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    ScrollTrigger.getAll().forEach(t => t.kill());
  }

  // =========================================================================
  // BINDING DE MÉTODOS GLOBALES EN WINDOW
  // =========================================================================
  private bindWindowGlobals(): void {
    const w = window as any;
    w.selectPase = this.selectPase.bind(this);
    w.selectModalidad = this.selectModalidad.bind(this);
    w.handlePaseSubmit = this.handlePaseSubmit.bind(this);
    w.toggleFaq = this.toggleFaq.bind(this);
    w.smoothScrollTo = this.smoothScrollTo.bind(this);
    w.toggleChatbot = this.toggleChatbot.bind(this);
    w.closeChatbot = this.closeChatbot.bind(this);
  }

  // =========================================================================
  // SPLASH INTRO & VIDEO DE FONDO
  // =========================================================================
  private initSplashIntro(): void {
    const splash = document.getElementById('splash-intro');
    const logo = document.getElementById('splash-logo');
    const badge = document.getElementById('splash-badge');

    if (!splash || !logo) {
      this.revealHeroLayers();
      return;
    }

    document.body.style.overflow = 'hidden';

    const tl = gsap.timeline({
      onComplete: () => {
        splash.remove();
        document.body.style.overflow = '';

        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        if (this.lenisInstance) {
          this.lenisInstance.scrollTo(0, { immediate: true });
        }

        ScrollTrigger.refresh();
        this.revealHeroLayers();
      }
    });

    tl.to(logo, {
      opacity: 1,
      scale: 1,
      duration: 0.6,
      ease: 'back.out(1.7)'
    })
    .to(badge, {
      opacity: 0,
      y: 10,
      duration: 0.3,
      delay: 0.3
    })
    .to(logo, {
      scale: 14,
      opacity: 0,
      filter: 'blur(20px)',
      duration: 0.7,
      ease: 'expo.in'
    }, 'zoom')
    .to(splash, {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out'
    }, 'zoom+=0.1');
  }

  private iniciarVideoFondo(): void {
    if (this.bgVideo?.nativeElement) {
      const video = this.bgVideo.nativeElement;
      video.muted = true;
      video.defaultMuted = true;
      video.play().catch(() => {
        window.addEventListener('click', () => video.play(), { once: true });
      });
    }
  }

  // =========================================================================
  // LENIS SMOOTH SCROLL
  // =========================================================================
  private initLenisSmoothScroll(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 0.85,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.0,
      infinite: false
    });

    lenis.on('scroll', (e: any) => {
      if (e.scroll <= 0) {
        window.scrollTo(0, 0);
      }
      ScrollTrigger.update();
    });

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    this.lenisInstance = lenis;
    (window as any).lenis = lenis;
  }

  public smoothScrollTo(target: string | HTMLElement, options?: { offset?: number; duration?: number }): void {
    const opts = options || {};
    let el: HTMLElement | null = null;

    if (typeof target === 'string') {
      if (target === '#mapa' || target === '#ubicacion') {
        el = document.getElementById('mapa-ubicacion');
        if (this.predioComponent) {
          const tabToSet = target === '#ubicacion' ? 'ubicacion' : 'predio';
          this.predioComponent.switchTab(tabToSet);
        }
      } else {
        el = document.querySelector(target) as HTMLElement;
      }
    } else {
      el = target;
    }

    if (!el) return;

    if (this.lenisInstance && typeof this.lenisInstance.scrollTo === 'function') {
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
  public revealHeroLayers(): void {
    const hero = document.getElementById('hero-section');
    if (!hero) return;
    const layers = Array.from(hero.querySelectorAll('.hero-layer')) as HTMLElement[];
    if (!layers.length) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      layers.forEach(l => {
        l.style.opacity = '1';
        l.style.visibility = 'visible';
        l.style.transform = '';
      });
      return;
    }

    gsap.set(layers, { opacity: 0, y: 40, visibility: 'hidden' });
    gsap.to(layers, {
      opacity: 1,
      y: 0,
      visibility: 'visible',
      duration: 0.6,
      delay: 0.2,
      stagger: 0.15,
      ease: 'expo.out',
      overwrite: true,
      clearProps: 'opacity,transform,visibility'
    });
  }

  private initHeroParallax(): void {
    const bg = document.getElementById('hero-bg');
    if (!bg) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.fromTo(bg,
      { y: 0 },
      {
        y: -80,
        ease: 'none',
        scrollTrigger: {
          trigger: '#hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6
        }
      }
    );
  }

  private initHeroCursorParallax(): void {
    const hero = document.getElementById('hero-section');
    const pNodes = document.querySelectorAll('.parallax-elem') as NodeListOf<HTMLElement>;

    if (!hero || !pNodes.length) return;

    hero.addEventListener('mousemove', (e: MouseEvent) => {
      const bounds = hero.getBoundingClientRect();
      const mouseX = (e.clientX - bounds.left) / bounds.width - 0.5;
      const mouseY = (e.clientY - bounds.top) / bounds.height - 0.5;

      pNodes.forEach(node => {
        const depth = parseFloat(node.getAttribute('data-depth') || '0.04');
        const transX = mouseX * depth * 240;
        const transY = mouseY * depth * 240;
        node.style.transform = `translate3d(${transX}px, ${transY}px, 0)`;
      });
    });

    hero.addEventListener('mouseleave', () => {
      pNodes.forEach(node => {
        node.style.transform = 'translate3d(0, 0, 0)';
        node.style.transition = 'transform 0.4s ease-out';
      });
    });

    hero.addEventListener('mouseenter', () => {
      pNodes.forEach(node => {
        node.style.transition = 'none';
      });
    });
  }

  // =========================================================================
  // PROGRESS BAR & SIDE RAIL
  // =========================================================================
  private initReadingProgressBar(): void {
    const readingBar = document.getElementById('reading-progress');

    const sectionMap = [
      { navTarget: 'hero-section', elementId: 'hero-section' },
      { navTarget: 'sobre-expojuy', elementId: 'sobre-expojuy' },
      { navTarget: 'mapa', elementId: 'mapa-ubicacion' },
      { navTarget: 'ubicacion', elementId: 'mapa-ubicacion' },
      { navTarget: 'expositores', elementId: 'expositores' },
      { navTarget: 'agenda', elementId: 'agenda' },
      { navTarget: 'novedades', elementId: 'novedades' },
      { navTarget: 'galeria', elementId: 'galeria' },
      { navTarget: 'entradas', elementId: 'entradas' },
      { navTarget: 'acreditaciones-section', elementId: 'acreditaciones-section' }
    ];

    const railIndicators = document.querySelectorAll('.rail-indicator');
    const navItems = document.querySelectorAll('header nav a.nav-item');

    window.addEventListener('scroll', () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;

      if (readingBar) {
        readingBar.style.width = scrolled + '%';
      }

      const scrollPos = window.scrollY + 280;

      sectionMap.forEach((item) => {
        const el = document.getElementById(item.elementId);
        if (el) {
          const top = el.offsetTop;
          const h = el.offsetHeight;

          if (scrollPos >= top && scrollPos < top + h) {
            railIndicators.forEach((r) => {
              const target = r.getAttribute('data-nav-target');
              const dot = r.querySelector('.rail-dot');
              if (dot) {
                if (target === item.navTarget) {
                  dot.classList.add('bg-brand-cyan-electric', 'scale-150');
                  dot.classList.remove('bg-slate-400/60', 'dark:bg-slate-600');
                } else {
                  dot.classList.remove('bg-brand-cyan-electric', 'scale-150');
                  dot.classList.add('bg-slate-400/60', 'dark:bg-slate-600');
                }
              }
            });

            navItems.forEach((navEl) => {
              const href = (navEl as HTMLAnchorElement).getAttribute('href')?.replace('#', '');
              if (href === item.navTarget) {
                navEl.classList.add('text-brand-cyan-electric');
                navEl.classList.remove('text-slate-700', 'dark:text-white', 'dark:text-purple-300');
              } else {
                navEl.classList.remove('text-brand-cyan-electric');
                navEl.classList.add('text-slate-700', 'dark:text-purple-300');
              }
            });

          }
        }
      });
    }, { passive: true });
  }

  // =========================================================================
  // SCROLL REVEAL (INTERSECTION OBSERVER)
  // =========================================================================
  private initScrollReveal(): void {
    const reveals = document.querySelectorAll('.reveal-on-scroll');
    if (!reveals.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
      });

      reveals.forEach(el => observer.observe(el));
    } else {
      reveals.forEach(el => el.classList.add('is-visible'));
    }
  }

  // =========================================================================
  // FAQ ACCORDION TOGGLE
  // =========================================================================
  public toggleFaq(event: Event): void {
    const btn = (event.target as HTMLElement).closest('button');
    if (!btn) return;
    const body = btn.nextElementSibling as HTMLElement | null;
    const icon = btn.querySelector('.faq-icon') as HTMLElement | null;
    if (!body) return;

    const isClosed = body.classList.contains('hidden');
    document.querySelectorAll('.faq-body').forEach(b => b.classList.add('hidden'));
    document.querySelectorAll('.faq-icon').forEach(i => (i as HTMLElement).style.transform = 'rotate(0deg)');

    if (isClosed) {
      body.classList.remove('hidden');
      if (icon) icon.style.transform = 'rotate(180deg)';
    }
  }

  // =========================================================================
  // COUNTDOWN TIMER
  // =========================================================================
  private initCountdown(): void {
    const targetDate = new Date('2026-10-09T09:00:00-03:00').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        const dEl = document.getElementById('cd-days');
        const hEl = document.getElementById('cd-hours');
        const mEl = document.getElementById('cd-mins');
        const sEl = document.getElementById('cd-secs');

        if (dEl) dEl.textContent = String(days).padStart(2, '0');
        if (hEl) hEl.textContent = String(hours).padStart(2, '0');
        if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
        if (sEl) sEl.textContent = String(seconds).padStart(2, '0');
      }
    };

    updateTimer();
    this.countdownInterval = setInterval(updateTimer, 1000);
  }

  // =========================================================================
  // DARK MODE TOGGLE
  // =========================================================================
  private initDarkMode(): void {
    const toggleBtn = document.getElementById('theme-toggle');
    const root = document.documentElement;

    const updateIcon = () => {
      if (!toggleBtn) return;
      const isDark = root.classList.contains('dark');
      toggleBtn.innerHTML = isDark
        ? '<span class="material-symbols-outlined text-[20px]">light_mode</span>'
        : '<span class="material-symbols-outlined text-[20px]">dark_mode</span>';
    };

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isDark = root.classList.toggle('dark');
        localStorage.setItem('expojuy-theme', isDark ? 'dark' : 'light');
        updateIcon();
        const w = window as any;
        if (typeof w.setLocationMapTheme === 'function') {
          w.setLocationMapTheme(isDark);
        }
      });
    }

    updateIcon();
  }

  // =========================================================================
  // MOBILE HAMBURGER MENU
  // =========================================================================
  private initMobileMenu(): void {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const menuIcon = document.getElementById('menu-icon');

    if (!mobileMenu || !mobileMenuBtn) return;

    let isMenuOpen = false;

    const toggleMenu = (open?: boolean) => {
      isMenuOpen = typeof open === 'boolean' ? open : !isMenuOpen;
      mobileMenuBtn.setAttribute('aria-expanded', String(isMenuOpen));

      if (isMenuOpen) {
        mobileMenu.classList.remove('invisible', 'opacity-0', '-translate-y-3');
        mobileMenu.classList.add('opacity-100', 'translate-y-0');
        if (menuIcon) menuIcon.textContent = 'close';
        document.body.style.overflow = 'hidden';
      } else {
        mobileMenu.classList.add('invisible', 'opacity-0', '-translate-y-3');
        mobileMenu.classList.remove('opacity-100', 'translate-y-0');
        if (menuIcon) menuIcon.textContent = 'menu';
        document.body.style.overflow = '';
      }
    };

    mobileMenuBtn.addEventListener('click', () => toggleMenu());

    mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const href = (link as HTMLAnchorElement).getAttribute('href');
        toggleMenu(false);
        if (href && href.startsWith('#')) {
          setTimeout(() => {
            this.smoothScrollTo(href);
          }, 300);
        }
      });
    });
  }

  // =========================================================================
  // ENTRADAS, PASES & DIGITAL PASS QR
  // =========================================================================
  private initEntradasAndQr(): void {
    this.selectPase('empresarial');
  }

  public selectPase(paseId: string): void {
    this.paseActual = paseId;
    document.querySelectorAll('.pase-pill').forEach(p => p.classList.remove('active-pase'));
    const btn = document.getElementById('pase-pill-' + paseId);
    if (btn) btn.classList.add('active-pase');
    this.renderPaseDetail();
    this.generatePassQR();
    this.applyPassTheme(paseId);
  }

  public selectModalidad(modo: string): void {
    this.ticketType = modo;
    document.querySelectorAll('.modo-btn').forEach(b => b.classList.remove('active-modo'));
    const btn = document.getElementById('modo-' + this.ticketType);
    if (btn) btn.classList.add('active-modo');
    this.renderPaseDetail();
    this.generatePassQR();
  }

  private applyPassTheme(paseId: string): void {
    const ticket = document.getElementById('pass-ticket');
    const infoCard = document.getElementById('pase-info-card');

    if (ticket) ticket.setAttribute('data-theme', paseId);
    if (infoCard) infoCard.setAttribute('data-theme', paseId);

    [ticket, infoCard].forEach(el => {
      if (!el) return;
      el.classList.remove('pass-waving');
      void el.offsetWidth;
      el.classList.add('pass-waving');
      el.addEventListener('animationend', () => el.classList.remove('pass-waving'), { once: true });
    });
  }

  private renderPaseDetail(): void {
    const pase = this.pasesData[this.paseActual];
    if (!pase) return;

    const isGroup = this.ticketType === 'group';
    const precio = isGroup ? pase.precioGrupal : pase.precioIndividual;

    const nombreEl = document.getElementById('pase-detail-nombre');
    const precioEl = document.getElementById('pase-detail-precio');
    const vigenciaEl = document.getElementById('pase-detail-vigencia');
    const precioUnitEl = document.getElementById('pase-detail-precio-unit');
    const listEl = document.getElementById('pase-detail-beneficios');
    const noteEl = document.getElementById('pase-detail-grupal-note');

    if (nombreEl) nombreEl.textContent = pase.nombre;
    if (precioEl) precioEl.textContent = '$' + precio.toLocaleString('es-AR');
    if (vigenciaEl) vigenciaEl.textContent = 'Por persona · ' + pase.vigencia;
    if (precioUnitEl) precioUnitEl.textContent = '$' + precio.toLocaleString('es-AR') + ' por persona';

    if (listEl) {
      listEl.innerHTML = '';
      pase.beneficios.forEach(b => {
        const li = document.createElement('li');
        li.className = 'flex items-start gap-2 text-sm text-on-surface-variant';
        li.innerHTML = '<span class="material-symbols-outlined text-brand-cyan-electric text-[17px] mt-0.5">check_circle</span>' + b;
        listEl.appendChild(li);
      });
    }

    if (noteEl) {
      if (isGroup) noteEl.classList.remove('hidden');
      else noteEl.classList.add('hidden');
    }
  }

  private generatePassQR(nombre?: string): void {
    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) return;

    const pase = this.pasesData[this.paseActual] || this.pasesData['empresarial'];
    const modo = this.ticketType === 'group' ? 'GRUPAL' : 'INDIVIDUAL';
    const data = 'EXPOJUY-2026|' + pase.nombre + '|' + modo + '|' + (nombre ? nombre.toUpperCase() : 'VISITANTE') + '|09-12-10-2026';

    qrContainer.innerHTML = '<canvas id="qrcode-canvas"></canvas>';
    const canvas = document.getElementById('qrcode-canvas') as HTMLCanvasElement;
    if (canvas) {
      QRCode.toCanvas(canvas, data, {
        width: 132,
        margin: 1,
        color: {
          dark: '#1A1226',
          light: '#FFFFFF'
        }
      }, (error) => {
        if (error) {
          qrContainer.textContent = 'QR';
        }
      });
    }
  }

  public handlePaseSubmit(e: Event): void {
    e.preventDefault();
    const input = document.getElementById('pase-name-input') as HTMLInputElement | null;
    const nombre = (input && input.value.trim()) ? input.value.trim() : 'Visitante ExpoJuy';

    const passName = document.getElementById('pass-name');
    const passTipo = document.getElementById('pass-tipo');
    if (passName) passName.textContent = nombre;
    if (passTipo) passTipo.textContent = this.pasesData[this.paseActual].nombre;

    this.generatePassQR(nombre);

    const wrap = document.getElementById('qrcode-wrap');
    if (wrap) wrap.classList.remove('is-locked');

    const success = document.getElementById('pase-form-success');
    if (success) {
      success.classList.remove('hidden');
      setTimeout(() => {
        this.smoothScrollTo(success, { offset: 0 });
      }, 150);
    }
  }

  public handleRegistrationSubmit(e: Event): void {
    e.preventDefault();
    const form = document.getElementById('acreditacion-form');
    const success = document.getElementById('acreditacion-success');
    if (form) form.classList.add('hidden');
    if (success) {
      success.classList.remove('hidden');
      this.smoothScrollTo(success, { offset: -100 });
    }
  }

  // =========================================================================
  // COUNTUP & BLURTEXT
  // =========================================================================
  private initTextEffects(): void {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const counters = Array.from(document.querySelectorAll('.count-up')) as HTMLElement[];
    if (counters.length) {
      if (reduced) {
        counters.forEach(el => {
          el.textContent = (parseFloat(el.getAttribute('data-count') || '0')) + (el.getAttribute('data-suffix') || '');
        });
      } else if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target as HTMLElement;
            const target = parseFloat(el.getAttribute('data-count') || '0');
            const suffix = el.getAttribute('data-suffix') || '';
            const duration = 1200;
            const start = performance.now();
            const step = (now: number) => {
              const p = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - p, 3);
              el.textContent = Math.round(target * eased) + suffix;
              if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            io.unobserve(el);
          });
        }, { threshold: 0.4 });
        counters.forEach(el => io.observe(el));
      }
    }

    document.querySelectorAll('.blur-split').forEach(h => {
      if (reduced) return;
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
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              gsap.fromTo(chars,
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
              );
              io.disconnect();
            }
          });
        }, { threshold: 0.25 });
        io.observe(h);
      }
    });
  }

  // =========================================================================
  // PACHAI CHATBOT FLOTANTE
  // =========================================================================
  private initChatbot(): void {
    this.renderChatMessages();
  }

  public toggleChatbot(): void {
    const panel = document.getElementById('chatbot-panel');
    const launcher = document.getElementById('chatbot-launcher');
    if (!panel || !launcher) return;

    const isOpen = panel.classList.contains('is-open');
    if (isOpen) {
      this.closeChatbot();
    } else {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      launcher.setAttribute('aria-expanded', 'true');
      document.body.classList.add('chat-open');
      const input = document.getElementById('chatbot-input') as HTMLInputElement | null;
      if (input) input.focus();
    }
  }

  public closeChatbot(): void {
    const panel = document.getElementById('chatbot-panel');
    const launcher = document.getElementById('chatbot-launcher');
    if (!panel || !launcher) return;

    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    launcher.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('chat-open');
  }

  public sendChatMessage(event: Event): void {
    event.preventDefault();
    const input = document.getElementById('chatbot-input') as HTMLInputElement | null;
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    this.chatMessages.push({ sender: 'user', text });
    this.renderChatMessages();
    input.value = '';

    this.showChatTyping();
    setTimeout(() => {
      this.hideChatTyping();
      this.chatMessages.push({ sender: 'bot', text: this.getBotReply(text) });
      this.renderChatMessages();
    }, 750);
  }

  public toggleVoiceInput(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.chatMessages.push({
        sender: 'bot',
        text: 'Tu navegador no soporta reconocimiento de voz nativo. Por favor escribe tu consulta.'
      });
      this.renderChatMessages();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-AR';
      recognition.interimResults = false;
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        const input = document.getElementById('chatbot-input') as HTMLInputElement | null;
        if (input) {
          input.value = transcript;
          const form = document.getElementById('chatbot-form') as HTMLFormElement | null;
          if (form) form.dispatchEvent(new Event('submit'));
        }
      };
      recognition.start();
    } catch {
      this.chatMessages.push({
        sender: 'bot',
        text: 'No se pudo activar el micrófono. Puedes escribir tu consulta directamente.'
      });
      this.renderChatMessages();
    }
  }

  private renderChatMessages(): void {
    const el = document.getElementById('chatbot-messages');
    if (!el) return;

    el.innerHTML = '';
    this.chatMessages.forEach(m => {
      const bubble = document.createElement('div');
      bubble.className = 'chatbot-message chatbot-message--' + m.sender;
      bubble.textContent = m.text;
      el.appendChild(bubble);
    });
    el.scrollTop = el.scrollHeight;
  }

  private showChatTyping(): void {
    const el = document.getElementById('chatbot-messages');
    if (!el) return;
    const bubble = document.createElement('div');
    bubble.className = 'chatbot-message chatbot-message--bot chatbot-message--typing';
    bubble.id = 'chatbot-typing';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    el.appendChild(bubble);
    el.scrollTop = el.scrollHeight;
  }

  private hideChatTyping(): void {
    const t = document.getElementById('chatbot-typing');
    if (t) t.remove();
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