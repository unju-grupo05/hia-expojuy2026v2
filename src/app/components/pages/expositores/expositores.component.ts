import { Component, OnInit, signal } from '@angular/core';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { ExhibitorService } from '../../../services/exhibitor.service';
import { Exhibitor } from '../../models/exhibitor.model';

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

  private currentExhibitorPage = 1;
  private readonly pageSize = 6;
  private currentCategory = 'all';
  private currentSearchQuery = '';

  constructor(private readonly exhibitorService: ExhibitorService) {}

  ngOnInit(): void {
    this.bindWindowGlobals();
    this.loadExhibitors(true);
  }

  private bindWindowGlobals(): void {
    const w = window as any;
    w.setCategoryFilter = this.setCategoryFilter.bind(this);
    w.filterExhibitors = this.filterExhibitors.bind(this);
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

  smoothScrollTo(target: string | HTMLElement): void {
    const w = window as any;
    if (typeof w.smoothScrollTo === 'function') {
      w.smoothScrollTo(target);
      return;
    }
    const el = typeof target === 'string' ? document.querySelector(target) as HTMLElement : target;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}