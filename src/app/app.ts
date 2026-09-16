import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  ElementRef,
  signal
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { ExhibitorService, Exhibitor } from './services/exhibitor.service';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as L from 'leaflet';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, InfiniteScrollDirective],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  // Signals & State para Expositores (Infinite Scroll)
  readonly exhibitors = signal<Exhibitor[]>([]);
  readonly loadingExhibitors = signal<boolean>(false);
  readonly hasMoreExhibitors = signal<boolean>(true);
  readonly exhibitorsError = signal<boolean>(false);

  private currentExhibitorPage = 1;
  private readonly pageSize = 6;
  private currentCategory = 'all';
  private currentSearchQuery = '';

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
  private threeSceneDisposers: Array<() => void> = [];

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private readonly exhibitorService: ExhibitorService,
    private readonly elRef: ElementRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.bindWindowGlobals();
      this.loadExhibitors(true);
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    gsap.registerPlugin(ScrollTrigger);

    this.initLenisSmoothScroll();
    this.initScrubbedBentoGallery();
    this.initHeroParallax();
    this.revealHeroLayers();
    this.initAccordionGallery();
    this.initSponsors3DScroll();
    this.initNewsModal();
    this.initStardustCanvas();
    this.initHeroCursorParallax();
    this.initReadingProgressBar();
    this.initScrollReveal();
    this.initCountdown();
    this.initDarkMode();
    this.initLocationMap();
    this.initMobileMenu();
    this.initEntradasAndQr();
    this.initMasterPlan3D();
    this.initTextEffects();
    this.initChatbot();
    this.initSponsorModals();

    // Estado inicial de pases y mapa
    setTimeout(() => {
      this.selectPase('empresarial');
      this.selectSectorMapa('a');
    }, 200);
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
    this.threeSceneDisposers.forEach(fn => fn());
    ScrollTrigger.getAll().forEach(t => t.kill());
  }

  // =========================================================================
  // BINDING DE MÉTODOS GLOBALES EN WINDOW
  // =========================================================================
  private bindWindowGlobals(): void {
    const w = window as any;
    w.skipBentoIntro = this.skipBentoIntro.bind(this);
    w.selectPase = this.selectPase.bind(this);
    w.selectModalidad = this.selectModalidad.bind(this);
    w.handlePaseSubmit = this.handlePaseSubmit.bind(this);
    w.openReminderModal = this.openReminderModal.bind(this);
    w.closeReminderModal = this.closeReminderModal.bind(this);
    w.submitReminder = this.submitReminder.bind(this);
    w.toggleFaq = this.toggleFaq.bind(this);
    w.switchDayTab = this.switchDayTab.bind(this);
    w.setCategoryFilter = this.setCategoryFilter.bind(this);
    w.filterExhibitors = this.filterExhibitors.bind(this);
    w.setMapFilter = this.setMapFilter.bind(this);
    w.searchMapStand = this.searchMapStand.bind(this);
    w.selectSectorMapa = this.selectSectorMapa.bind(this);
    w.smoothScrollTo = this.smoothScrollTo.bind(this);
    w.toggleChatbot = this.toggleChatbot.bind(this);
    w.closeChatbot = this.closeChatbot.bind(this);
    w.closeSponsorModal = this.closeSponsorModal.bind(this);
  }

  // =========================================================================
  // REQUISITO: INFINITE SCROLL (ngx-infinite-scroll) & EXPOSITORES
  // =========================================================================
  loadExhibitors(reset = false): void {
    if (this.loadingExhibitors()) return;

    if (reset) {
      this.currentExhibitorPage = 1;
      this.hasMoreExhibitors.set(true);
      this.exhibitors.set([]);
    }

    if (!this.hasMoreExhibitors()) return;

    this.loadingExhibitors.set(true);
    this.exhibitorsError.set(false);

    this.exhibitorService.getExhibitors({
      page: this.currentExhibitorPage,
      pageSize: this.pageSize,
      category: this.currentCategory,
      search: this.currentSearchQuery
    }).subscribe({
      next: (res) => {
        if (reset) {
          this.exhibitors.set(res.items);
        } else {
          this.exhibitors.update(current => [...current, ...res.items]);
        }
        this.hasMoreExhibitors.set(res.hasMore);
        this.loadingExhibitors.set(false);
        this.currentExhibitorPage++;
      },
      error: () => {
        this.loadingExhibitors.set(false);
        this.exhibitorsError.set(true);
      }
    });
  }

  onScrollExhibitors(): void {
    if (this.hasMoreExhibitors() && !this.loadingExhibitors()) {
      this.loadExhibitors(false);
    }
  }

  retryLoadExhibitors(): void {
    this.loadExhibitors(false);
  }

  setCategoryFilter(category: string, event?: Event): void {
    this.currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active-filter'));

    if (event && event.target) {
      const target = (event.target as HTMLElement).closest('.filter-btn');
      if (target) target.classList.add('active-filter');
    }

    this.loadExhibitors(true);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.currentSearchQuery = target.value.trim();
    this.loadExhibitors(true);
  }

  filterExhibitors(): void {
    const input = document.getElementById('exhibitor-search') as HTMLInputElement | null;
    this.currentSearchQuery = input ? input.value.trim() : '';
    this.loadExhibitors(true);
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
      touchMultiplier: 1.0
    });

    lenis.on('scroll', () => {
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
        const transX = mouseX * depth * 320;
        const transY = mouseY * depth * 320;
        const rot = mouseX * 8;
        node.style.transform = `translate3d(${transX}px, ${transY}px, 0) rotate(${rot}deg)`;
      });
    });

    hero.addEventListener('mouseleave', () => {
      pNodes.forEach(node => {
        node.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
        node.style.transition = 'transform 0.5s ease-out';
      });
    });

    hero.addEventListener('mouseenter', () => {
      pNodes.forEach(node => {
        node.style.transition = 'none';
      });
    });
  }

  // =========================================================================
  // 4. GALERÍA ACORDEÓN (Skiper 52 / HoverExpand)
  // =========================================================================
  private initAccordionGallery(): void {
    const gallery = document.getElementById('accordion-gallery');
    if (!gallery) return;

    const cards = Array.from(gallery.querySelectorAll('.acc-card')) as HTMLElement[];
    if (!cards.length) return;

    const setActive = (targetCard: HTMLElement) => {
      cards.forEach(card => {
        const isCurrent = card === targetCard;
        card.classList.toggle('acc-card-active', isCurrent);
        card.setAttribute('aria-expanded', isCurrent ? 'true' : 'false');
      });
    };

    cards.forEach(card => {
      card.addEventListener('mouseenter', () => setActive(card));
      card.addEventListener('focus', () => setActive(card));
      card.addEventListener('click', () => setActive(card));
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
  // 6. NOVEDADES MODAL & SPOTLIGHT
  // =========================================================================
  private initNewsModal(): void {
    const modal = document.getElementById('news-modal');
    const backdrop = document.getElementById('news-modal-backdrop');
    const closeBtn = document.getElementById('news-modal-close');
    const shareBtn = document.getElementById('news-modal-share');
    const copyBtn = document.getElementById('news-modal-copy');
    if (!modal) return;

    const NEWS: Record<string, { img: string; badge: string; date: string; title: string; body: string[] }> = {
      bioceanico: {
        img: './Img/ExpoJuy-1.webp',
        badge: 'Infraestructura',
        date: '09 Octubre 2026',
        title: 'Somos Desarrollo, Potencia & Futuro',
        body: [
          'Se realizará en el predio de la Ciudad Cultural',
          'Ejes centrales de la exposición: *Rondas de Negocios e Innovación: Espacios de vinculación empresarial, digitalización aduanera, agrotecnología, logística y energías renovables.'
        ]
      },
      cauchari: {
        img: './Img/Cauchari.jpg',
        badge: 'Energías Limpias',
        date: '02 Agosto 2026',
        title: 'El Parque Solar Cauchari expondrá sus proyectos de expansión e hidrógeno verde en el Pabellón de Energías',
        body: [
          'El Parque Solar Cauchari, el mayor de su tipo a gran altura del mundo, presentará en el Pabellón de Energías sus nuevas fases de expansión y la hoja de ruta para la producción de hidrógeno verde en la Puna.',
          'La iniciativa apunta a atraer inversores globales y cerrar acuerdos de suministro de energía limpia con industrias de litio y minería sustentable durante los días de la feria.'
        ]
      },
      ventanilla: {
        img: './Img/Expojuy-8.webp',
        badge: 'Innovación',
        date: '11 Octubre 2026',
        title: 'Presentarán sistema de ventanilla única digital para acelerar el comercio fronterizo',
        body: [
          'Se dará a conocer una plataforma digital que centralizará los trámites de importación y exportación en pasos fronterizos integrados de la región.',
          'Reducción de hasta un 40% en los tiempos de cruce y trazabilidad de cargas en línea (pruebas piloto en el último trimestre del año).'
        ]
      }
    };

    const refs = {
      image: document.getElementById('news-modal-image') as HTMLImageElement | null,
      badge: document.getElementById('news-modal-badge'),
      date: document.getElementById('news-modal-date'),
      title: document.getElementById('news-modal-title'),
      body: document.getElementById('news-modal-body')
    };

    const openNews = (key: string) => {
      const n = NEWS[key];
      if (!n) return;
      if (refs.image) { refs.image.src = n.img; refs.image.alt = n.title; }
      if (refs.badge) refs.badge.textContent = n.badge;
      if (refs.date) refs.date.textContent = n.date;
      if (refs.title) refs.title.textContent = n.title;
      if (refs.body) {
        refs.body.innerHTML = '';
        n.body.forEach(par => {
          const p = document.createElement('p');
          p.textContent = par;
          refs.body!.appendChild(p);
        });
      }
      modal.classList.add('news-modal-open');
      document.body.style.overflow = 'hidden';
    };

    const closeNews = () => {
      modal.classList.remove('news-modal-open');
      document.body.style.overflow = '';
    };

    document.querySelectorAll('.news-card').forEach((card) => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-news');
        if (key) openNews(key);
      });
      card.addEventListener('keydown', (e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter' || ke.key === ' ') {
          ke.preventDefault();
          const key = card.getAttribute('data-news');
          if (key) openNews(key);
        }
      });

      let spotRaf: number | null = null;
      card.addEventListener('mousemove', (e: Event) => {
        const me = e as MouseEvent;
        if (spotRaf) return;
        spotRaf = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          (card as HTMLElement).style.setProperty('--mouse-x', (me.clientX - rect.left) + 'px');
          (card as HTMLElement).style.setProperty('--mouse-y', (me.clientY - rect.top) + 'px');
          spotRaf = null;
        });
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeNews);
    if (backdrop) backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeNews(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('news-modal-open')) closeNews();
    });

    const copyLink = (btn: HTMLElement, label: string) => {
      const url = window.location.href.split('#')[0] + '#noticias';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> <span>Enlace copiado</span>';
          setTimeout(() => { btn.innerHTML = '<span class="material-symbols-outlined text-sm">link</span> <span>' + label + '</span>'; }, 2500);
        });
      }
    };

    if (shareBtn) shareBtn.addEventListener('click', () => {
      const url = window.location.href.split('#')[0] + '#noticias';
      if (navigator.share) {
        navigator.share({ title: document.title, url }).catch(() => {});
      } else {
        copyLink(shareBtn, 'Compartir novedad');
      }
    });
    if (copyBtn) copyBtn.addEventListener('click', () => copyLink(copyBtn, 'Copiar enlace'));
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
  // 10. AGENDA & DIAS TABS SWITCHER
  // =========================================================================
  switchDayTab(dayNum: number, event?: Event): void {
    document.querySelectorAll('.day-tab').forEach(b => b.classList.remove('active-day'));
    if (event && event.target) {
      const btn = (event.target as HTMLElement).closest('.day-tab');
      if (btn) btn.classList.add('active-day');
    }

    document.querySelectorAll('.day-content').forEach(c => c.classList.add('hidden'));
    const targetDay = document.getElementById('day-' + dayNum);
    if (targetDay) {
      targetDay.classList.remove('hidden');
      const hiddenCards = targetDay.querySelectorAll('.reveal-on-scroll');
      hiddenCards.forEach(c => c.classList.add('is-visible'));
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
  // 12. REMINDER MODAL FOR AGENDA
  // =========================================================================
  openReminderModal(title: string, time: string): void {
    const modal = document.getElementById('reminder-modal');
    const actTitle = document.getElementById('reminder-activity-title');
    const actTime = document.getElementById('reminder-activity-time');
    const success = document.getElementById('reminder-success');
    const form = document.getElementById('reminder-form');

    if (!modal) return;
    if (actTitle) actTitle.textContent = title;
    if (actTime) actTime.textContent = time;
    if (success) success.classList.add('hidden');
    if (form) form.classList.remove('hidden');

    modal.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
  }

  closeReminderModal(): void {
    const modal = document.getElementById('reminder-modal');
    if (modal) {
      modal.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  }

  submitReminder(event: Event): void {
    event.preventDefault();
    const form = document.getElementById('reminder-form');
    const success = document.getElementById('reminder-success');
    if (form) form.classList.add('hidden');
    if (success) success.classList.remove('hidden');
    setTimeout(() => {
      this.closeReminderModal();
    }, 2400);
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
  // 15. LEAFLET LOCATION MAP
  // =========================================================================
  private initLocationMap(): void {
    const container = document.getElementById('location-map');
    if (!container) return;

    const BOUNDS = L.latLngBounds(
      L.latLng(-24.1950, -65.3180),
      L.latLng(-24.1720, -65.2920)
    );

    const map = L.map('location-map', {
      center: [-24.1835, -65.3050],
      zoom: 16,
      minZoom: 14,
      maxZoom: 19,
      maxBounds: BOUNDS,
      maxBoundsViscosity: 1.0,
      scrollWheelZoom: true
    });

    const TILES = {
      light: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      })
    };

    let currentTheme: 'dark' | 'light' = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    TILES[currentTheme].addTo(map);

    L.marker([-24.1835, -65.3050])
      .addTo(map)
      .bindPopup(
        '<strong>Ciudad Cultural — ExpoJuy 2026</strong><br>Av. Bolivia, San Salvador de Jujuy.<br>' +
        '<a href="https://maps.app.goo.gl/nqbHeuuaThDJd9b5A" target="_blank" rel="noopener">Abrir en Google Maps</a>',
        { maxWidth: 260 }
      )
      .openPopup();

    (window as any).setLocationMapTheme = (isDark: boolean) => {
      const next = isDark ? 'dark' : 'light';
      if (next === currentTheme) return;
      map.removeLayer(TILES[currentTheme]);
      TILES[next].addTo(map);
      currentTheme = next;
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) map.invalidateSize();
        });
      }, { threshold: 0.05 });
      io.observe(container);
    }
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
  // 18. MAPA 3D MASTER PLAN WEBGL (Three.js Engine)
  // =========================================================================
  private standsDb: Array<any> = [];
  private standMeshesMap: Record<string, any> = {};

  private initMasterPlan3D(): void {
    const canvas = document.getElementById('masterplanCanvas') as HTMLCanvasElement | null;
    const wrapper = document.getElementById('map-3d-wrapper');
    if (!canvas || !wrapper) return;

    const STATED_COMPANIES: Record<string, string[]> = {
      mineria: ["Jujuy Litio S.A.", "Exar Energía & Litio", "Sales de Jujuy", "Mina Pirquitas", "JEMSE Estatal", "Lithium Tech Andes", "Puna Mining Corp", "Solar & Baterías Jujuy"],
      agro: ["Cooperativa de Tabacaleros", "Ledesma S.A.A.I.", "Valles Calchaquíes Gourmet", "Bodega Fernando", "Hortalizas Perico", "Finca El Chañar", "Cítricos San Pedro"],
      tech: ["Polo Tecnológico Jujuy", "Telecom Argentina", "Banco Macro", "Consejo de la Microempresa", "Unju Innova", "BioJujuy Lab", "Andes Cloud Systems", "Fibra Óptica Jujuy"],
      artesanias: ["Hilanderías de Yavi", "Cerámica Quebradeña", "Tejidos Puna Viva", "Orfebrería Tilcareña", "Maderas Nativas Yungas", "Filigrana de Humahuaca", "Telares de Casabindo"],
      gastro: ["Empanadas Las Vicuñitas", "Humitas Don Sixto", "Cerveza Tilcarock", "Asador Criollo Quebradeño", "Chivito & Cordero Yala", "Tamales El Carmen", "GastroTruck Tilcara", "Alfajores Jujeñitos"],
      maquinaria: ["Scania Camiones Puna", "Caterpillar Minera", "Toyota Hilux Derudder", "John Deere Agro", "Ford Trucks Jujuy", "Komatsu Maquinarias", "Agronorte Jujuy"]
    };

    const SECTOR_ACTIVITIES: Record<string, Array<{ nombre: string; hora: string; dia: string }>> = {
      cubierto: [
        { nombre: 'Cumbre del Triángulo del Litio & Energías Limpias', hora: '14:00 - 16:30', dia: '09 Oct' },
        { nombre: 'Panel de Innovación Tecnológica del NOA', hora: '10:00 - 12:00', dia: '10 Oct' },
        { nombre: 'Mesa de Comercio Exterior e Inversiones', hora: '16:00 - 18:00', dia: '11 Oct' }
      ],
      artesano: [
        { nombre: 'Taller Vivo de Hilado y Teñido en Lana de Llama', hora: '11:00 - 13:00', dia: '09-11 Oct' },
        { nombre: 'Muestra de Alfarería y Técnicas Ancestrales', hora: '15:30 - 17:30', dia: '09 Oct' }
      ],
      descubierto: [
        { nombre: 'Demostración Dinámica de Maquinaria y Minería', hora: '15:00 - 17:00', dia: '09 Oct' },
        { nombre: 'Test Drive de Vehículos 4x4 y Utilitarios Eléctricos', hora: '11:00 - 18:00', dia: '10 Oct' }
      ],
      gastronomico: [
        { nombre: 'Masterclass de Cocina Regional & Humitas Andinas', hora: '13:00 - 14:30', dia: '09 Oct' },
        { nombre: 'Festival de Cerveza Artesanal y Maridaje Andino', hora: '19:00 - 22:00', dia: '12 Oct' }
      ],
      espectaculos: [
        { nombre: 'Gran Noche Musical Andina — Escenario Mayor', hora: '20:30 - 23:30', dia: '09 Oct' },
        { nombre: 'Gala de Cierre y Espectáculo Folklórico', hora: '20:00 - 23:00', dia: '11 Oct' }
      ],
      conferencias: [
        { nombre: 'Acto Protocolar Inaugural con Autoridades', hora: '09:30 - 11:00', dia: '09 Oct' },
        { nombre: 'Foro Logístico del Corredor Bioceánico', hora: '10:00 - 12:30', dia: '10 Oct' }
      ]
    };

    const STANDS_DB: Array<any> = [];
    let currentStandIndex = 0;

    const getRandomStatus = () => {
      const rand = Math.random();
      if (rand < 0.22) return 'disponible';
      if (rand < 0.50) return 'reservado';
      return 'ocupado';
    };

    const getRandomCompany = (categoryList: string[], status: string) => {
      if (status === 'disponible') return 'Espacio Disponible para Reserva';
      const list = categoryList || STATED_COMPANIES['tech'];
      return list[Math.floor(Math.random() * list.length)];
    };

    // Pabellón Cubierto Stands
    for (let i = 0; i < 4; i++) {
      currentStandIndex++;
      const id = `CUB-${String(currentStandIndex).padStart(2, '0')}`;
      const status = getRandomStatus();
      STANDS_DB.push({
        id,
        sectorKey: 'cubierto',
        sectorName: 'Pabellón A - Cubiertos',
        rubro: 'Minería, Litio & Energías Renovables',
        company: getRandomCompany(STATED_COMPANIES['mineria'], status),
        x: -40 + i * 26,
        z: -19,
        w: 10,
        d: 5.5,
        h: 3.5,
        status,
        color: 0x00C2D1
      });
    }

    for (let i = 0; i < 3; i++) {
      currentStandIndex++;
      const id = `CUB-${String(currentStandIndex).padStart(2, '0')}`;
      const status = getRandomStatus();
      STANDS_DB.push({
        id,
        sectorKey: 'cubierto',
        sectorName: 'Pabellón A - Cubiertos',
        rubro: 'Tecnología & Telecomunicaciones',
        company: getRandomCompany(STATED_COMPANIES['tech'], status),
        x: 41,
        z: -10 + i * 12,
        w: 6,
        d: 8,
        h: 3.5,
        status,
        color: 0x7E57C2
      });
    }

    // Artesanías
    for (let i = 0; i < 6; i++) {
      currentStandIndex++;
      const id = `ART-${String(i + 1).padStart(2, '0')}`;
      const status = getRandomStatus();
      STANDS_DB.push({
        id,
        sectorKey: 'artesano',
        sectorName: 'Sector de Artesanías',
        rubro: 'Artesanías & Tejidos Andinos',
        company: getRandomCompany(STATED_COMPANIES['artesanias'], status),
        x: -75 + (i % 2) * 8,
        z: -20 + Math.floor(i / 2) * 16,
        w: 5,
        d: 5,
        h: 2.8,
        status,
        color: 0xE879F9
      });
    }

    // Descubierto
    for (let i = 0; i < 4; i++) {
      currentStandIndex++;
      const id = `DESC-${String(i + 1).padStart(2, '0')}`;
      const status = getRandomStatus();
      STANDS_DB.push({
        id,
        sectorKey: 'descubierto',
        sectorName: 'Área Descubierta & Maquinarias',
        rubro: 'Maquinaria Pesada & Logística',
        company: getRandomCompany(STATED_COMPANIES['maquinaria'], status),
        x: -30 + (i % 2) * 35,
        z: 40 + Math.floor(i / 2) * 20,
        w: 12,
        d: 10,
        h: 4.2,
        status,
        color: 0x00E5FF
      });
    }

    // Gastronomía
    for (let i = 0; i < 4; i++) {
      currentStandIndex++;
      const id = `GAST-${String(i + 1).padStart(2, '0')}`;
      const status = getRandomStatus();
      STANDS_DB.push({
        id,
        sectorKey: 'gastronomico',
        sectorName: 'Polo Gastronómico Regional',
        rubro: 'Gastronomía Tradicional Jujeña',
        company: getRandomCompany(STATED_COMPANIES['gastro'], status),
        x: 60,
        z: 35 + i * 10,
        w: 6,
        d: 6,
        h: 3.2,
        status,
        color: 0xFFB74D
      });
    }

    this.standsDb = STANDS_DB;

    // Escena Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0814);
    scene.fog = new THREE.FogExp2(0x0a0814, 0.0055);

    const width = wrapper.clientWidth || 800;
    const height = wrapper.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(70, 75, 95);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 25;
    controls.maxDistance = 220;
    controls.target.set(0, 0, 0);

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00C2D1, 1.2);
    dirLight.position.set(60, 100, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const violetLight = new THREE.DirectionalLight(0x9D4EDD, 0.9);
    violetLight.position.set(-60, 80, -40);
    scene.add(violetLight);

    // Suelo
    const groundGeo = new THREE.PlaneGeometry(240, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x141122, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(240, 40, 0x00C2D1, 0x221a36);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    // Techo del pabellón cubierto
    const roofGroup = new THREE.Group();
    const roofGeo = new THREE.BoxGeometry(100, 1.5, 52);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x5E3A8C,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 7.5, 0);
    roofGroup.add(roof);
    scene.add(roofGroup);

    // Renderizar Stands
    const standMeshesMap: Record<string, any> = {};
    const interactiveMeshes: THREE.Mesh[] = [];

    STANDS_DB.forEach(stand => {
      const group = new THREE.Group();
      group.position.set(stand.x, 0, stand.z);

      const standGeo = new THREE.BoxGeometry(stand.w, stand.h, stand.d);
      const standMat = new THREE.MeshStandardMaterial({
        color: stand.color,
        roughness: 0.4,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(standGeo, standMat);
      mesh.position.y = stand.h / 2;
      mesh.castShadow = true;
      group.add(mesh);

      // Hitbox para raycaster
      const hitGeo = new THREE.BoxGeometry(stand.w * 1.05, stand.h * 1.2, stand.d * 1.05);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitBox = new THREE.Mesh(hitGeo, hitMat);
      hitBox.position.y = stand.h / 2;
      (hitBox as any).standData = stand;
      group.add(hitBox);

      interactiveMeshes.push(hitBox);
      scene.add(group);

      standMeshesMap[stand.id] = { group, mesh, hitBox, stand };
    });

    this.standMeshesMap = standMeshesMap;

    // Raycaster para selección
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selectedStand: any = null;

    const selectStand = (standData: any) => {
      if (!standData) return;
      selectedStand = standData;

      // Actualizar info panel
      const nombreEl = document.getElementById('map-info-nombre');
      const temaEl = document.getElementById('map-info-tematica');
      const standsEl = document.getElementById('map-info-stands');
      const expListEl = document.getElementById('map-info-expositores');
      const actListEl = document.getElementById('map-info-actividades');

      if (nombreEl) nombreEl.textContent = `${standData.id} · ${standData.sectorName}`;
      if (temaEl) temaEl.textContent = standData.rubro;
      if (standsEl) standsEl.textContent = `Empresa: ${standData.company} (${standData.status.toUpperCase()})`;

      if (expListEl) {
        expListEl.innerHTML = '';
        const list = STATED_COMPANIES[standData.sectorKey] || [standData.company];
        list.slice(0, 5).forEach(c => {
          const li = document.createElement('li');
          li.className = 'px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold';
          li.textContent = c;
          expListEl.appendChild(li);
        });
      }

      if (actListEl) {
        actListEl.innerHTML = '';
        const acts = SECTOR_ACTIVITIES[standData.sectorKey] || SECTOR_ACTIVITIES['cubierto'];
        acts.forEach(a => {
          const li = document.createElement('li');
          li.className = 'flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800';
          li.innerHTML = `<span>${a.nombre}</span><span class="font-bold text-primary dark:text-brand-cyan-electric">${a.hora}</span>`;
          actListEl.appendChild(li);
        });
      }

      // Pin Tag
      const pinTagText = document.getElementById('pin-tag-text');
      if (pinTagText) pinTagText.textContent = `${standData.id}: ${standData.company.substring(0, 20)}`;
    };

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as any;
        if (hit.standData) {
          selectStand(hit.standData);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Floating Pin 2D / 3D tracking
    const floatingPin = document.getElementById('floating-pin');
    const updateFloatingPin = () => {
      if (!floatingPin || !selectedStand) return;
      const pos = new THREE.Vector3(selectedStand.x, selectedStand.h + 1.5, selectedStand.z);
      pos.project(camera);

      const x = (pos.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
      const y = (-(pos.y * 0.5) + 0.5) * renderer.domElement.clientHeight;

      if (pos.z < 1) {
        floatingPin.style.display = 'block';
        floatingPin.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
      } else {
        floatingPin.style.display = 'none';
      }
    };

    // Botones de vistas de cámara
    const btnIso = document.getElementById('btnViewIso');
    const btnTop = document.getElementById('btnViewTop');
    const btnEntrance = document.getElementById('btnViewEntrance');
    const btnToggleRoof = document.getElementById('btnToggleRoof');

    const setActiveViewBtn = (activeBtn: HTMLElement | null) => {
      [btnIso, btnTop, btnEntrance].forEach(b => {
        if (b) b.classList.remove('active');
      });
      if (activeBtn) activeBtn.classList.add('active');
    };

    if (btnIso) {
      btnIso.addEventListener('click', () => {
        setActiveViewBtn(btnIso);
        gsap.to(camera.position, { x: 70, y: 75, z: 95, duration: 1.2 });
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.2 });
      });
    }

    if (btnTop) {
      btnTop.addEventListener('click', () => {
        setActiveViewBtn(btnTop);
        gsap.to(camera.position, { x: 0, y: 130, z: 0.1, duration: 1.2 });
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.2 });
      });
    }

    if (btnEntrance) {
      btnEntrance.addEventListener('click', () => {
        setActiveViewBtn(btnEntrance);
        gsap.to(camera.position, { x: -88, y: 12, z: 78, duration: 1.2 });
        gsap.to(controls.target, { x: -30, y: 5, z: 20, duration: 1.2 });
      });
    }

    if (btnToggleRoof) {
      btnToggleRoof.addEventListener('click', () => {
        roofGroup.visible = !roofGroup.visible;
        btnToggleRoof.classList.toggle('active', roofGroup.visible);
        btnToggleRoof.textContent = roofGroup.visible ? '🏛 Techo: ON' : '🏛 Techo: OFF';
      });
    }

    // Zoom Buttons
    const btnZoomIn = document.getElementById('btnZoomIn3D');
    const btnZoomOut = document.getElementById('btnZoomOut3D');
    const btnResetView = document.getElementById('btnResetView3D');

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        camera.fov = Math.max(20, camera.fov - 6);
        camera.updateProjectionMatrix();
      });
    }
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        camera.fov = Math.min(75, camera.fov + 6);
        camera.updateProjectionMatrix();
      });
    }
    if (btnResetView) {
      btnResetView.addEventListener('click', () => {
        camera.fov = 45;
        camera.updateProjectionMatrix();
        if (btnIso) btnIso.click();
      });
    }

    // Resize Observer
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    ro.observe(wrapper);

    // Render loop
    let running = true;
    const renderLoop = () => {
      if (!running) return;
      controls.update();
      updateFloatingPin();
      renderer.render(scene, camera);
      requestAnimationFrame(renderLoop);
    };

    selectStand(STANDS_DB[0]);
    renderLoop();

    this.threeSceneDisposers.push(() => {
      running = false;
      ro.disconnect();
      renderer.dispose();
    });
  }

  setMapFilter(rubro: string): void {
    document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active-filter'));
    const btn = document.querySelector(`[data-filter="${rubro}"]`);
    if (btn) btn.classList.add('active-filter');

    const key = (rubro || 'all').toLowerCase();
    this.standsDb.forEach(stand => {
      const item = this.standMeshesMap[stand.id];
      if (!item) return;

      const match = key === 'all' ||
        stand.rubro.toLowerCase().includes(key) ||
        stand.sectorName.toLowerCase().includes(key) ||
        stand.company.toLowerCase().includes(key);

      item.mesh.material.opacity = match ? 1.0 : 0.15;
      item.mesh.material.transparent = true;
    });
  }

  searchMapStand(): void {
    const input = document.getElementById('map-search') as HTMLInputElement | null;
    const query = input ? input.value.toLowerCase().trim() : '';

    this.standsDb.forEach(stand => {
      const item = this.standMeshesMap[stand.id];
      if (!item) return;

      const match = !query ||
        stand.id.toLowerCase().includes(query) ||
        stand.company.toLowerCase().includes(query) ||
        stand.rubro.toLowerCase().includes(query) ||
        stand.sectorName.toLowerCase().includes(query);

      item.mesh.material.opacity = match ? 1.0 : 0.12;
      item.mesh.material.transparent = true;
    });
  }

  selectSectorMapa(id: string): void {
    const sectorMapping: Record<string, string> = {
      'a': 'cubierto',
      'b': 'cubierto',
      'c': 'artesano',
      'gastronomico': 'gastronomico',
      'auditorio': 'conferencias',
      'estacionamiento': 'descubierto'
    };
    const targetSector = sectorMapping[id] || 'cubierto';
    const match = this.standsDb.find(s => s.sectorKey === targetSector);
    if (match && this.standMeshesMap[match.id]) {
      this.standMeshesMap[match.id].hitBox.dispatchEvent(new Event('pointerdown'));
    }
  }

  // =========================================================================
  // 19. COUNTUP & BLURTEXT (React-Bits Replica en GSAP)
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
