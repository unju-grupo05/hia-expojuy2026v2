import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoticiasService } from '../../../services/noticias.service';
import { MediaService } from '../../../services/media.service';
import { scheduleIdle } from '../../../core/idle';
import { NoticiaDTO } from '../../../models/noticia.model';

export interface NewsItem {
  id: string;
  img: string;
  badge: string;
  date: string;
  title: string;
  body: string[];
  isLarge: boolean;
  displaySize: 'large' | 'small';
}

export interface NewsPage {
  pageIndex: number;
  largeCard: NewsItem | null;
  leftCards: NewsItem[];     // Máximo 2
  bottomCards: NewsItem[];   // Máximo 2
  totalCards: number;
}

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './publicaciones.component.html',
  styleUrls: ['./publicaciones.component.css']
})
export class NovedadesComponent implements OnInit, OnDestroy {
  private cancelIdle: (() => void) | null = null;

  readonly news = signal<NewsItem[]>([]);
  readonly pages = signal<NewsPage[]>([]);
  readonly loadingNews = signal<boolean>(false);
  readonly newsError = signal<boolean>(false);

  public currentSlide = 0;

  public isModalOpen = false;
  public copySuccess = false;
  public activeNews: NewsItem = {
    id: '',
    img: '',
    badge: '',
    date: '',
    title: '',
    body: [],
    isLarge: false,
    displaySize: 'small'
  };

  constructor(
    private noticiasService: NoticiasService,
    private mediaService: MediaService
  ) {}

  ngOnInit(): void {
    this.cargarNoticias();
  }

  cargarNoticias(): void {
    this.loadingNews.set(true);
    this.newsError.set(false);

    this.noticiasService.getNoticias().subscribe({
      next: (res) => {
        const items: NoticiaDTO[] = res.data ?? [];
        const parsed: NewsItem[] = items.map((n) => {
          const isLarge = n.isLarge === true || n.displaySize === 'large';
          return {
            id: String(n.id),
            img: this.mediaService.normalizeImageUrl(n.imagen || ''),
            badge: n.categoria || 'Noticia',
            date: this.formatFecha(n.fecha),
            title: n.titulo || '',
            body: (n.descripcion || '').split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0),
            isLarge,
            displaySize: isLarge ? 'large' : 'small'
          };
        });

        this.news.set(parsed);
        this.armarPaginas(parsed);
        this.currentSlide = 0;
        this.loadingNews.set(false);
      },
      error: (err) => {
        this.loadingNews.set(false);
        this.newsError.set(true);
        console.error('Error al obtener noticias:', err);
      }
    });
  }

  /**
   * Algoritmo de Llenado Prioritario y Reglas de Paginación:
   * - 1 Noticia Grande + Hasta 4 Noticias Chicas (2 a la izquierda + 2 abajo) por página.
   * - Regla de Noticias Grandes Múltiples: Cada página solo puede albergar 1 noticia Grande.
   *   Si existen 2 noticias Grandes, la 2da noticia Grande se desplaza a la Página 2.
   * - Llenado Prioritario de Huecos (Página 1 primero): Las noticias chicas rellenan primero
   *   los 4 espacios de la Página 1 antes de derivarse a la Página 2.
   */
  private armarPaginas(items: NewsItem[]): void {
    if (!items || items.length === 0) {
      this.pages.set([]);
      return;
    }

    const largeItems = items.filter((n) => n.isLarge);
    const smallItems = items.filter((n) => !n.isLarge);

    // Si no hay ninguna noticia configurada como grande, promovemos la primera chica
    // para mantener la jerarquía visual de la maqueta
    if (largeItems.length === 0 && smallItems.length > 0) {
      const first = smallItems.shift();
      if (first) {
        largeItems.push({ ...first, isLarge: true, displaySize: 'large' });
      }
    }

    const numPagesByLarge = largeItems.length;
    const numPagesBySmall = Math.ceil(smallItems.length / 4);
    const totalPages = Math.max(1, numPagesByLarge, numPagesBySmall);

    const resultPages: NewsPage[] = [];

    for (let p = 0; p < totalPages; p++) {
      const largeCard = p < largeItems.length ? largeItems[p] : null;
      
      // Tomamos hasta 4 noticias chicas para la página 'p' (llenado prioritario de página 1 a n)
      const pageSmallItems = smallItems.slice(p * 4, (p + 1) * 4);
      const leftCards = pageSmallItems.slice(0, 2);   // Primeras 2 a la izquierda
      const bottomCards = pageSmallItems.slice(2, 4); // Siguientes 2 abajo

      const totalCards = (largeCard ? 1 : 0) + leftCards.length + bottomCards.length;

      if (totalCards > 0) {
        resultPages.push({
          pageIndex: p,
          largeCard,
          leftCards,
          bottomCards,
          totalCards
        });
      }
    }

    this.pages.set(resultPages);
  }

  retryLoadNews(): void {
    this.cargarNoticias();
  }

  nextSlide(): void {
    const total = this.pages().length;
    if (total > 0) {
      this.currentSlide = (this.currentSlide + 1) % total;
    }
  }

  prevSlide(): void {
    const total = this.pages().length;
    if (total > 0) {
      this.currentSlide = (this.currentSlide - 1 + total) % total;
    }
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.pages().length) {
      this.currentSlide = index;
    }
  }

  openNewsModal(item: NewsItem): void {
    this.activeNews = item;
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  onCardKeydown(event: KeyboardEvent, item: NewsItem): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.openNewsModal(item);
  }

  closeNewsModal(): void {
    this.isModalOpen = false;
    this.copySuccess = false;
    document.body.style.overflow = '';
  }

  shareNews(): void {
    const url = window.location.href.split('#')[0] + '#novedades';
    if (navigator.share) {
      navigator.share({ title: this.activeNews.title, url }).catch(() => {});
    } else {
      this.copyLink();
    }
  }

  copyLink(): void {
    const url = window.location.href.split('#')[0] + '#novedades';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.copySuccess = true;
        setTimeout(() => (this.copySuccess = false), 2500);
      });
    }
  }

  ngOnDestroy(): void {
    this.cancelIdle?.();
    this.cancelIdle = null;
  }

  private formatFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(`${fecha}T00:00:00`);
    if (isNaN(date.getTime())) return fecha;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

// Alias para compatibilidad
export { NovedadesComponent as NoticiasComponent };