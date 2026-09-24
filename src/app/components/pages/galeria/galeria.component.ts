import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GaleriaApi } from '../../../services/apiGaleria.service';
import { ApiMediaService } from '../../../services/apiMedia.service';

export interface GaleriaItem {
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
export class GaleriaComponent implements OnInit {
  // Las primeras 10 imágenes se muestran en el acordeón expandible.
  readonly accordionLimit = 10;
  // El resto se muestran en un carrusel paginado.
  readonly carouselPageSize = 6;

  readonly items = signal<GaleriaItem[]>([]);
  readonly accordionItems = computed(() => this.items().slice(0, this.accordionLimit));
  readonly carouselItems = computed(() => this.items().slice(this.accordionLimit));
  readonly carouselPages = computed<GaleriaItem[][]>(() => {
    const rest = this.carouselItems();
    const pages: GaleriaItem[][] = [];
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
    private galeriaApi: GaleriaApi,
    private apiMedia: ApiMediaService
  ) {}

  ngOnInit(): void {
    this.cargarGaleria();
  }

  cargarGaleria(): void {
    this.loading.set(true);
    this.error.set(false);

    this.galeriaApi.getGaleria().subscribe({
      next: (res) => {
        const items = Array.isArray(res?.data) ? res.data : [];
        const mapped: GaleriaItem[] = items.map((g: any) => ({
          id: g.id,
          titulo: g.titulo || '',
          descripcion: g.descripcion || '',
          imagen: this.apiMedia.normalizeImageUrl(g.imagen || ''),
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
}