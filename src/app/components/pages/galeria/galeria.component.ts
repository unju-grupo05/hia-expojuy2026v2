import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GaleriaService } from '../../../services/galeria.service';
import { GaleriaItem } from '../../../models/galeria.model';
import { MediaService } from '../../../services/media.service';
import { scheduleIdle } from '../../../core/idle';

/**
 * View model del carrusel. Se deriva de `GaleriaItem` (contrato de la API)
 * normalizando los textos opcionales: el template no tiene que chequear nulos.
 */
export interface GaleriaItemView {
  id: number;
  titulo: string;
  descripcion: string;
  imagen: string;
  seccion: string;
  orden: number;
}

@Component({
  selector: 'app-galeria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './galeria.component.html',
  styleUrl: './galeria.component.css'
})
export class GaleriaComponent implements OnInit, OnDestroy {
  // Las primeras 10 imágenes se muestran en el acordeón expandible.
  readonly accordionLimit = 10;
  // El resto se muestran en un carrusel paginado.
  readonly carouselPageSize = 6;

  /** Cancela la carga diferida si el componente se destruye antes de partir. */
  private cancelIdle: (() => void) | null = null;

  readonly items = signal<GaleriaItemView[]>([]);
  readonly accordionItems = computed(() => this.items().slice(0, this.accordionLimit));
  readonly carouselItems = computed(() => this.items().slice(this.accordionLimit));
  readonly carouselPages = computed<GaleriaItemView[][]>(() => {
    const rest = this.carouselItems();
    const pages: GaleriaItemView[][] = [];
    for (let i = 0; i < rest.length; i += this.carouselPageSize) {
      pages.push(rest.slice(i, i + this.carouselPageSize));
    }
    return pages;
  });

  readonly loading = signal(true);
  readonly error = signal(false);

  public activeIndex = 0;
  public currentPage = 0;

  constructor(
    private galeriaService: GaleriaService,
    private mediaService: MediaService
  ) {}

  ngOnInit(): void {
    this.cargarGaleria();
  }

  cargarGaleria(): void {
    this.loading.set(true);
    this.error.set(false);

    this.galeriaService.getGaleria().subscribe({
      next: (res) => {
        const items: GaleriaItem[] = res.data ?? [];
        const mapped: GaleriaItemView[] = items.map((g) => ({
          id: g.id,
          titulo: g.titulo || '',
          descripcion: g.descripcion || '',
          imagen: this.mediaService.normalizeImageUrl(g.imagen || ''),
          seccion: g.seccion || '',
          orden: g.orden ?? 0
        }));

        this.items.set(mapped);
        this.activeIndex = 0;
        this.currentPage = 0;
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(true);
        console.error('Error al cargar galería:', err);
      }
    });
  }

  setActive(index: number): void {
    this.activeIndex = index;
  }

  nextPage(): void {
    const total = this.carouselPages().length;
    if (total > 1) {
      this.currentPage = (this.currentPage + 1) % total;
    }
  }

  prevPage(): void {
    const total = this.carouselPages().length;
    if (total > 1) {
      this.currentPage = (this.currentPage - 1 + total) % total;
    }
  }

  goToPage(index: number): void {
    this.currentPage = index;
  }

  ngOnDestroy(): void {
    this.cancelIdle?.();
    this.cancelIdle = null;
  }
}