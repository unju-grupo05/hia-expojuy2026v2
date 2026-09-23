import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ApiEjes } from '../../../services/api-ejes.service';

@Component({
  selector: 'app-ejes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ejes.component.html',
  styleUrl: './ejes.component.css'
})
export class EjesComponent implements OnInit {
  ejes: any[] = [];
  cargando: boolean = true;

  constructor(
    private apiEjes: ApiEjes,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.obtenerEjes();
  }

  obtenerEjes(): void {
    this.cargando = true;
    this.apiEjes.getEjes().subscribe({
      next: (res) => {
        const datos = res?.data || res;
        this.ejes = Array.isArray(datos) ? [...datos] : [];
        this.cargando = false;

        // Forzamos la detección de cambios en Angular
        this.cdr.detectChanges();

        // Si estamos en el navegador, re-activamos las animaciones de scroll tras insertar las cards
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => {
            this.activarScrollRevealLocal();
          }, 100);
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
    } else {
      reveals.forEach(el => el.classList.add('is-visible'));
    }

    // Refrescar GSAP ScrollTrigger si está cargado en window
    const w = window as any;
    if (w.ScrollTrigger) {
      w.ScrollTrigger.refresh();
    }
  }
}