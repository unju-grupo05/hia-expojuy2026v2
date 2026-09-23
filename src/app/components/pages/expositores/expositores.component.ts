import { Component, Inject, OnInit, PLATFORM_ID, ChangeDetectorRef, signal } from '@angular/core';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { Exhibitor } from '../../models/exhibitor.model';
import { ExpositorApi } from '../../../services/apiExpositores.service';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-expositores',
  standalone: true,
  imports: [InfiniteScrollDirective],
  templateUrl: './expositores.component.html',
  styleUrl: './expositores.component.css'
})
export class ExpositoresComponent implements OnInit {
  readonly exhibitors = signal<Exhibitor[]>([]);
  readonly loadingExhibitors = signal<boolean>(false);
  readonly hasMoreExhibitors = signal<boolean>(true);
  readonly exhibitorsError = signal<boolean>(false);
  readonly activeCategory = signal<string>('all');

  private currentExhibitorPage = 1;
  private readonly pageSize = 6;
  private currentCategory = 'all';
  private currentSearchQuery = '';

  constructor(
    private apiExpositores: ExpositorApi,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.bindWindowGlobals();
    this.loadExhibitors(true);
  }

  private bindWindowGlobals(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    (window as any).filtrarExpositores = () => this.filterExhibitors();
  }

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

    this.apiExpositores.getExpositores({
      page: this.currentExhibitorPage,
      pageSize: this.pageSize,
      category: this.currentCategory,
      search: this.currentSearchQuery
    }).subscribe({
      next: (res) => {
        const datos = res?.data && Array.isArray(res.data.items) ? res.data : res;
        const items: Exhibitor[] = Array.isArray(datos.items) ? datos.items : [];

        if (reset) {
          this.exhibitors.set(items);
        } else {
          this.exhibitors.update(current => [...current, ...items]);
        }

        this.hasMoreExhibitors.set(datos.hasMore !== false);
        this.currentExhibitorPage++;
        this.loadingExhibitors.set(false);
        this.cdr.detectChanges();

        if (isPlatformBrowser(this.platformId)) {
          this.activarScrollRevealLocal();
        }
      },
      error: (err) => {
        this.loadingExhibitors.set(false);
        this.exhibitorsError.set(true);
        this.hasMoreExhibitors.set(false);
        this.cdr.detectChanges();
        console.error('Error al obtener expositores:', err);
      }
    });
  }

  onScrollExhibitors(): void {
    if (this.hasMoreExhibitors()) {
      this.loadExhibitors(false);
    }
  }

  retryLoadExhibitors(): void {
    this.loadExhibitors(true);
  }

  setCategoryFilter(category: string): void {
    this.currentCategory = category;
    this.activeCategory.set(category);
    this.loadExhibitors(true);
  }

  filterExhibitors(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const input = document.getElementById('exhibitor-search') as HTMLInputElement | null;
    this.currentSearchQuery = input?.value ?? '';
    this.loadExhibitors(true);
  }

  smoothScrollTo(target: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const id = target.replace(/^#/, '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private activarScrollRevealLocal(): void {
    const reveals = document.querySelectorAll('#expositores .reveal-on-scroll');
    reveals.forEach((el) => {
      if (el instanceof Element) {
        el.classList.add('visible');
      }
    });
  }
}