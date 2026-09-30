import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoticiasService } from '../../../services/noticias.service';
import { MediaService } from '../../../services/media.service';
import { scheduleIdle } from '../../../core/idle';
import { NoticiaDTO } from '../../../models/noticia.model';

interface NewsItem {
  id: string;
  img: string;
  badge: string;
  date: string;
  title: string;
  body: string[];
}

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './publicaciones.component.html',
  styleUrls: ['./publicaciones.component.css']
})
export class NovedadesComponent implements OnInit, OnDestroy {
  public readonly pageSize = 5;
  private cancelIdle: (() => void) | null = null;

  readonly news = signal<NewsItem[]>([]);
  readonly slides = signal<NewsItem[][]>([]);
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
    body: []
  };

  constructor(
    private noticiasService: NoticiasService,
    private mediaService: MediaService
  ) {}

  ngOnInit(): void {
    this.cancelIdle = scheduleIdle(() => {
      this.cancelIdle = null;
      this.cargarNoticias();
    }, 2000);
  }

  cargarNoticias(): void {
    this.loadingNews.set(true);
    this.newsError.set(false);

    this.noticiasService.getNoticias().subscribe({
      next: (res) => {
        const items: NoticiaDTO[] = res.data ?? [];
        const parsed: NewsItem[] = items.map((n) => ({
          id: String(n.id),
          img: this.mediaService.normalizeImageUrl(n.imagen || ''),
          badge: n.categoria || 'Noticia',
          date: this.formatFecha(n.fecha),
          title: n.titulo || '',
          body: (n.descripcion || '').split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0)
        }));

        this.news.set(parsed);
        this.armarSlides(parsed);
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

  private armarSlides(items: NewsItem[]): void {
    const chunks: NewsItem[][] = [];
    for (let i = 0; i < items.length; i += this.pageSize) {
      chunks.push(items.slice(i, i + this.pageSize));
    }
    this.slides.set(chunks.length > 0 ? chunks : []);
  }

  // Distribuye los espaciados de la grilla (md: 2 columnas, lg: 3 columnas) para que ninguna fila quede incompleta, incluida la última página parcial.
  public layoutClass(slide: NewsItem[], idx: number): string {
    if (slide.length === this.pageSize) {
      return idx === 0 ? 'md:col-span-2' : '';
    }
    const last = idx === slide.length - 1;
    if (slide.length === 1) return 'md:col-span-2 lg:col-span-3';
    if (slide.length === 2) return last ? 'lg:col-span-2' : '';
    if (slide.length === 3) return last ? 'md:col-span-2 lg:col-span-1' : '';
    if (slide.length === 4) return last ? 'lg:col-span-3' : '';
    return '';
  }

  retryLoadNews(): void {
    this.cargarNoticias();
  }

  nextSlide(): void {
    const total = this.slides().length;
    if (total > 0) {
      this.currentSlide = (this.currentSlide + 1) % total;
    }
  }

  prevSlide(): void {
    const total = this.slides().length;
    if (total > 0) {
      this.currentSlide = (this.currentSlide - 1 + total) % total;
    }
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
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