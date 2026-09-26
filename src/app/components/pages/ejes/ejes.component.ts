import { Component, OnInit, OnDestroy, DestroyRef, ChangeDetectorRef, Inject, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EjesService } from '../../../services/ejes.service';
import { Eje } from '../../../models/eje.model';

@Component({
  selector: 'app-ejes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ejes.component.html',
  styleUrl: './ejes.component.css'
})
export class EjesComponent implements OnInit, OnDestroy {
  ejes: Eje[] = [];
  cargando: boolean = true;

  private readonly destroyRef = inject(DestroyRef);
  private revealTimeouts = new Set<ReturnType<typeof setTimeout>>();
  private observers: IntersectionObserver[] = [];

  constructor(
    private ejesService: EjesService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.obtenerEjes();
  }

  obtenerEjes(): void {
    this.cargando = true;
    this.ejesService
      .getEjes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.ejes = res.data ?? [];
          this.cargando = false;

          // Forzamos la detección de cambios en Angular
          this.cdr.detectChanges();

          // Si estamos en el navegador, re-activamos las animaciones de scroll tras insertar las cards
          if (isPlatformBrowser(this.platformId)) {
            const timeout = setTimeout(() => {
              this.revealTimeouts.delete(timeout);
              this.activarScrollRevealLocal();
            }, 100);
            this.revealTimeouts.add(timeout);
          }
        },
        error: (err) => {
          this.cargando = false;
          this.cdr.detectChanges();
          console.error('Error al obtener ejes:', err);
        }
      });
  }

  private activarScrollRevealLocal(): void {
    const reveals = document.querySelectorAll('#sobre-expojuy .reveal-on-scroll');

    if (!reveals.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05 });

      reveals.forEach(el => observer.observe(el));
      this.observers.push(observer);
    } else {
      reveals.forEach(el => el.classList.add('is-visible'));
    }

    // `refresh()` es idempotente: el observer anterior ya soltó los nodos que
    // entro en viewport, y los nuevos se re-observan en cada recarga de datos.
    ScrollTrigger.getAll().forEach(trigger => trigger.refresh());
  }

  ngOnDestroy(): void {
    for (const timeout of this.revealTimeouts) clearTimeout(timeout);
    this.revealTimeouts.clear();

    for (const observer of this.observers) observer.disconnect();
    this.observers.length = 0;
  }
}