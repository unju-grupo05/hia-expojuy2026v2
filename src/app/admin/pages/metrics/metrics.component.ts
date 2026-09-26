import { Component, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface AdminMetrics {
  totalPosts: number;
  published: number;
  mediaCount: number;
  aiQueriesToday: number;
  aiTokensConsumed: number;
}

export interface RecentActivity {
  id: string;
  type: 'post' | 'media' | 'ai' | 'auth';
  title: string;
  detail: string;
  time: string;
  icon: string;
  badgeClass: string;
}

@Component({
  selector: 'app-metrics',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink],
  templateUrl: './metrics.component.html'
})
export class MetricsComponent {
  /**
   * Sin endpoint de métricas en el backend: los valores arrancan en cero.
   * NO reintroducir cifras inventadas, serían datos falsos presentados como reales.
   * Cada campo debe poblarse desde la API cuando exista el endpoint correspondiente.
   */
  public metrics = signal<AdminMetrics>({
    totalPosts: 0,
    published: 0,
    mediaCount: 0,
    aiQueriesToday: 0,
    aiTokensConsumed: 0
  });

  /** Sin fuente de datos real: la actividad reciente queda vacía. */
  public recentActivity = signal<RecentActivity[]>([]);
}
