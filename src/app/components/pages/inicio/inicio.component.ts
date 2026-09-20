import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, ElementRef, ViewChild } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EjesComponent } from '../ejes/ejes.component';
import { PredioComponent } from '../predio/predio.component';
import { UbicacionComponent } from '../ubicacion/ubicacion.component';
import { ExpositoresComponent } from '../expositores/expositores.component';
import { AgendaComponent } from '../agenda/agenda.component';
import { NovedadesComponent } from '../novedades/novedades.component';
import { GaleriaComponent } from '../galeria/galeria.component';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EjesComponent,
    PredioComponent,
    UbicacionComponent,
    ExpositoresComponent,
    AgendaComponent,
    NovedadesComponent,
    GaleriaComponent
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit, AfterViewInit, OnDestroy {

  // Entradas / Pases state
  private paseActual = 'empresarial';
  private ticketType = 'individual';
  private readonly pasesData: Record<string, {
    nombre: string;
    precioIndividual: number;
    precioGrupal: number;
    vigencia: string;
    beneficios: string[];
  }> = {
    general: {
      nombre: 'Pase General',
      precioIndividual: 15000,
      precioGrupal: 12000,
      vigencia: '1 día · acceso general',
      beneficios: [
        'Acceso al predio por 1 día ferial',
        'Recorrido por todos los pabellones',
        'Charlas abiertas y muestra comercial',
        'App oficial de la feria con agenda',
        'Acceso a zonas gastronómicas'
      ]
    },
    full: {
      nombre: 'Pase Full',
      precioIndividual: 38000,
      precioGrupal: 29000,
      vigencia: '4 días · acceso completo',
      beneficios: [
        'Acceso los 4 días a todos los sectores',
        'Conferencias plenarias y workshops',
        'Pabellones del Corredor Bioceánico',
        'Rondas de negocios (cupos disponibles)',
        'Networking & coworking en la feria',
        'Material descargable de expositores'
      ]
    },
    empresarial: {
      nombre: 'Pase Empresarial',
      precioIndividual: 60000,
      precioGrupal: 48000,
      vigencia: '4 días · acceso premium',
      beneficios: [
        'Todo lo incluido del Pase Full',
        'Sala VIP Empresarial con catering',
        'Rondas de negocios B2B prioritarias',
        'Espacios de matchmaking corporativo',
        'Atención de anfitriones personales',
        'Credencial nominada con QR premium'
      ]
    }
  };

  // Chatbot PachAI state
  private chatMessages: Array<{ sender: 'bot' | 'user'; text: string }> = [
    {
      sender: 'bot',
      text: '¡Hola! Soy PachAI, el asistente virtual de ExpoJuy 2026. Puedo orientarte sobre expositores, agenda, ubicación del predio o acreditación. ¿En qué te ayudo?'
    }
  ];

  // Instancias y suscripciones de limpieza
  private lenisInstance: Lenis | null = null;
  private animFrameId: number | null = null;
  private countdownInterval: any = null;
  private resizeListeners: Array<() => void> = [];

  @ViewChild(PredioComponent) predioComponent!: PredioComponent;
  @ViewChild('bgVideo') bgVideo!: ElementRef<HTMLVideoElement>;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private readonly elRef: ElementRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.bindWindowGlobals();
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.scrollTo(0, 0);
    gsap.registerPlugin(ScrollTrigger);

    this.initSplashIntro();
    this.iniciarVideoFondo();
    this.initLenisSmoothScroll();
    this.initHeroParallax();
    this.revealHeroLayers();
    this.initSponsors3DScroll();
    this.initStardustCanvas();
    this.initHeroCursorParallax();
    this.initReadingProgressBar();
    this.initScrollReveal();
    this.initCountdown();
    this.initDarkMode();
    this.initMobileMenu();
    this.initEntradasAndQr();
    this.initTextEffects();
    this.initChatbot();
    this.initSponsorModals();

    // Estado inicial de pases y selección de sector en el mapa 3D
    setTimeout(() => {
      this.selectPase('empresarial');
      this.predioComponent?.selectSectorMapa('a');
    }, 200);
  }

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
        // 1. ELIMINAR EL OVERLAY DEL DOM para que no ocupe ni afecte el flujo del scroll
        splash.remove(); 
        document.body.style.overflow = '';

        // 2. Anclar la pantalla arriba de todo de forma estricta
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        if (this.lenisInstance) {
          this.lenisInstance.scrollTo(0, { immediate: true });
        }

        // 3. Forzar a GSAP a recalcular las alturas reales desde y=0
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

  ngOnDestroy(): void {
    if (this.lenisInstance) {
      this.lenisInstance.destroy();
      this.lenisInstance = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.resizeListeners.forEach(fn => window.removeEventListener('resize', fn));
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
    w.closeSponsorModal = this.closeSponsorModal.bind(this);
  }

  // =========================================================================
  // REPRODUCCIÓN CONTINUA DEL VIDEO DE FONDO
  // =========================================================================
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
  // 1. LENIS SMOOTH SCROLL + INTEGRACIÓN CON GSAP TICKER
  // =========================================================================
  private initLenisSmoothScroll(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 0.85,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.0,
      infinite: false // Evita comportamientos infinitos o de rebote
    });

    lenis.on('scroll', (e: any) => {
      // Si el usuario intenta scrollear hacia arriba del inicio (scroll < 0), forzar posición a 0
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

  smoothScrollTo(target: string | HTMLElement, options?: { offset?: number; duration?: number }): void {
    const opts = options || {};
    const el = typeof target === 'string' ? document.querySelector(target) as HTMLElement : target;
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
  // 2. GSAP SCRUBBED BENTO GALLERY INTRO
  // =========================================================================
  private initScrubbedBentoGallery(): void {
    const wrapper = document.getElementById('bento-wrapper');
    const stage = document.getElementById('bento-stage');
    const grid = document.getElementById('bento-grid');
    const centerEmblem = document.getElementById('bento-center-emblem');
    const prompt = document.getElementById('bento-prompt');
    const cards = document.querySelectorAll('.bento-card');

    if (!wrapper || !stage || !grid) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      this.revealHeroLayers();
      return;
    }

    const bentoTL = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        pin: stage,
        anticipatePin: 1,
        onLeave: () => {
          stage.style.pointerEvents = 'none';
          this.revealHeroLayers();
        },
        onEnterBack: () => {
          stage.style.pointerEvents = 'auto';
        }
      }
    });

    bentoTL.to(prompt, { opacity: 0, y: -24, duration: 0.25 }, 0);
    bentoTL.to(grid, { scale: 4.8, ease: 'power2.inOut', duration: 1.8 }, 0);
    bentoTL.to(cards, { opacity: 0.1, filter: 'blur(12px)', ease: 'power2.inOut', duration: 1.4 }, 0.1);
    bentoTL.to(centerEmblem, { scale: 2.8, opacity: 0, ease: 'power3.in', duration: 0.9 }, 1.1);
    bentoTL.to(stage, { opacity: 0, visibility: 'hidden', duration: 0.35, ease: 'none' }, 1.8);

    // Navegación táctil amortiguada
    let touchStartY = 0;
    let touchStartX = 0;
    let isTouchingStage = false;

    stage.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches && e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        isTouchingStage = true;
      }
    }, { passive: true });

    stage.addEventListener('touchmove', (e: TouchEvent) => {
      if (!isTouchingStage || !e.touches || e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = touchStartY - currentY;
      const deltaX = touchStartX - currentX;

      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 2) {
        touchStartY = currentY;
        touchStartX = currentX;
        const dampedDelta = Math.sign(deltaY) * Math.min(Math.abs(deltaY), 35);
        const maxBentoScroll = wrapper.offsetTop + wrapper.offsetHeight;
        const currentScroll = window.scrollY;
        const targetY = Math.max(0, Math.min(maxBentoScroll, currentScroll + dampedDelta));

        window.scrollTo({ top: targetY, behavior: 'auto' });
        if (this.lenisInstance) {
          this.lenisInstance.scrollTo(targetY, { immediate: true });
        }
      }
    }, { passive: true });

    const handleTouchEnd = () => { isTouchingStage = false; };
    stage.addEventListener('touchend', handleTouchEnd, { passive: true });
    stage.addEventListener('touchcancel', handleTouchEnd, { passive: true });
  }

  skipBentoIntro(): void {
    const hero = document.getElementById('hero-section');
    if (hero) {
      if (this.lenisInstance) {
        this.lenisInstance.scrollTo(hero, { offset: 0, duration: 1.2 });
      } else {
        hero.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  // =========================================================================
  // 3. HERO LAYERS & PARALLAX
  // =========================================================================
  revealHeroLayers(): void {
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
  // 5. SPONSORS 3D PARALLAX & INFINITE SCROLL
  // =========================================================================
  private initSponsors3DScroll(): void {
    const section = document.getElementById('sponsors-section');
    if (!section) return;

    const col1 = section.querySelector('.sponsor-col-1');
    const col2 = section.querySelector('.sponsor-col-2');
    const col3 = section.querySelector('.sponsor-col-3');
    if (!col1 || !col2 || !col3) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const isMobile = window.innerWidth < 768;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
        invalidateOnRefresh: true
      }
    });

    tl.to(col1, { y: isMobile ? -300 : -650, ease: 'none' }, 0)
      .to(col2, { y: isMobile ? -450 : -1020, ease: 'none' }, 0)
      .to(col3, { y: isMobile ? -250 : -520, ease: 'none' }, 0);
  }

  // =========================================================================
  // 7. CANVAS DE PARTICULAS (STARDUST)
  // =========================================================================
  private initStardustCanvas(): void {
    const canvas = document.getElementById('stars-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    this.resizeListeners.push(() => window.removeEventListener('resize', onResize));

    const particleCount = 65;
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      vx: number;
      vy: number;
      baseAlpha: number;
      pulse: number;
    }> = [];
    const colors = ['#00C2D1', '#9D4EDD', '#5E3A8C', '#B299D3', '#FFFFFF'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.4,
        baseAlpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI
      });
    }

    let lastScrollY = window.scrollY;
    let scrollSpeed = 0;

    window.addEventListener('scroll', () => {
      const currentY = window.scrollY;
      scrollSpeed = Math.abs(currentY - lastScrollY) * 0.08;
      lastScrollY = currentY;
    }, { passive: true });

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      scrollSpeed *= 0.94;

      particles.forEach(p => {
        p.x += p.vx + (p.vx > 0 ? scrollSpeed : -scrollSpeed) * 0.4;
        p.y += p.vy - scrollSpeed * 0.5;
        p.pulse += 0.025;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentAlpha = p.baseAlpha + Math.sin(p.pulse) * 0.2;
        ctx.save();
        ctx.globalAlpha = Math.max(0.1, Math.min(1, currentAlpha));
        ctx.fillStyle = p.color;
        ctx.shadowBlur = p.radius * 4;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      this.animFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  // =========================================================================
  // 8. PROGRESS BAR & SIDE RAIL
  // =========================================================================
  private initReadingProgressBar(): void {
    const readingBar = document.getElementById('reading-progress');
    const sections = ['hero-section', 'sobre-expojuy', 'mapa', 'ubicacion', 'expositores', 'agenda', 'noticias', 'galeria', 'sponsors-section', 'entradas', 'contacto-section'];
    const railIndicators = document.querySelectorAll('.rail-indicator');

    window.addEventListener('scroll', () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      if (readingBar) {
        readingBar.style.width = scrolled + '%';
      }

      const scrollPos = window.scrollY + 200;
      sections.forEach((secId, idx) => {
        const el = document.getElementById(secId);
        if (el) {
          const top = el.offsetTop;
          const h = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + h) {
            railIndicators.forEach((r, rIdx) => {
              if (rIdx === idx) {
                r.classList.add('bg-brand-cyan-electric', 'scale-125');
                r.classList.remove('bg-slate-300', 'dark:bg-slate-700');
              } else {
                r.classList.remove('bg-brand-cyan-electric', 'scale-125');
                r.classList.add('bg-slate-300', 'dark:bg-slate-700');
              }
            });
          }
        }
      });
    }, { passive: true });
  }

  // =========================================================================
  // 9. SCROLL REVEAL (INTERSECTION OBSERVER)
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
  // 11. FAQ ACCORDION TOGGLE
  // =========================================================================
  toggleFaq(event: Event): void {
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
  // 13. COUNTDOWN TIMER
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
  // 14. DARK MODE TOGGLE
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
  // 16. MOBILE HAMBURGER MENU
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
  // 17. ENTRADAS, PASES & DIGITAL PASS QR
  // =========================================================================
  private initEntradasAndQr(): void {
    this.selectPase('empresarial');
  }

  selectPase(paseId: string): void {
    this.paseActual = paseId;
    document.querySelectorAll('.pase-pill').forEach(p => p.classList.remove('active-pase'));
    const btn = document.getElementById('pase-pill-' + paseId);
    if (btn) btn.classList.add('active-pase');
    this.renderPaseDetail();
    this.generatePassQR();
    this.applyPassTheme(paseId);
  }

  selectModalidad(modo: string): void {
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

  handlePaseSubmit(e: Event): void {
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

  handleRegistrationSubmit(e: Event): void {
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
  // 19. COUNTUP & BLURTEXT
  // =========================================================================
  private initTextEffects(): void {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // CountUp
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

    // BlurText Split
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
  // 20. PACHAI CHATBOT FLOTANTE
  // =========================================================================
  private initChatbot(): void {
    this.renderChatMessages();
  }

  toggleChatbot(): void {
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

  closeChatbot(): void {
    const panel = document.getElementById('chatbot-panel');
    const launcher = document.getElementById('chatbot-launcher');
    if (!panel || !launcher) return;

    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    launcher.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('chat-open');
  }

  sendChatMessage(event: Event): void {
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

  toggleVoiceInput(): void {
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

  // =========================================================================
  // 21. SPONSOR MODALS
  // =========================================================================
  private initSponsorModals(): void {
    const modal = document.getElementById('sponsor-modal');
    if (!modal) return;

    document.querySelectorAll('.sponsor-card-3d').forEach(card => {
      card.addEventListener('click', () => this.openSponsorModal(card as HTMLElement));
      card.addEventListener('keydown', (e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter' || ke.key === ' ') {
          ke.preventDefault();
          this.openSponsorModal(card as HTMLElement);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        this.closeSponsorModal();
      }
    });
  }

  openSponsorModal(card: HTMLElement): void {
    const modal = document.getElementById('sponsor-modal');
    const img = document.getElementById('modal-image') as HTMLImageElement | null;
    const name = document.getElementById('modal-name');
    const role = document.getElementById('modal-role');
    const desc = document.getElementById('modal-description');
    const link = document.getElementById('modal-link') as HTMLAnchorElement | null;

    if (!modal) return;

    if (img) {
      img.src = card.dataset['img'] || '';
      img.alt = card.dataset['name'] || '';
    }
    if (name) name.textContent = card.dataset['name'] || '';
    if (role) role.textContent = card.dataset['role'] || '';
    if (desc) desc.textContent = card.dataset['desc'] || '';
    if (link) link.href = card.dataset['website'] || 'https://expojuy.com.ar';

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (this.lenisInstance) this.lenisInstance.stop();

    const closeBtn = document.getElementById('sponsor-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  closeSponsorModal(): void {
    const modal = document.getElementById('sponsor-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
      if (this.lenisInstance) this.lenisInstance.start();
    }
  }
}