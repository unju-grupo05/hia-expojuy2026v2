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
  // Consumo directo de la estructura JSON esperada del backend
  public metrics = signal<AdminMetrics>({
    totalPosts: 14,
    published: 10,
    mediaCount: 42,
    aiQueriesToday: 328,
    aiTokensConsumed: 84210
  });

  public recentActivity = signal<RecentActivity[]>([
    {
      id: 'act-1',
      type: 'ai',
      title: 'Consulta PachAI: Ruta del Corredor Bioceánico',
      detail: 'Visitante consultó rutas de acceso y aranceles de exportación',
      time: 'Hace 4 minutos',
      icon: 'smart_toy',
      badgeClass: 'bg-purple-100 text-primary dark:bg-purple-950/60 dark:text-purple-300'
    },
    {
      id: 'act-2',
      type: 'post',
      title: 'Publicación Editada: Lanzamiento Ronda Minera',
      detail: 'Actualización de horarios y panelistas en Ciudad Cultural',
      time: 'Hace 28 minutos',
      icon: 'edit_note',
      badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
    },
    {
      id: 'act-3',
      type: 'media',
      title: 'Nueva Imagen: stand-mineria-sustentable.jpg',
      detail: 'Recurso optimizado subido al CDN (410 KB)',
      time: 'Hace 1 hora',
      icon: 'add_photo_alternate',
      badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-brand-cyan-electric'
    },
    {
      id: 'act-4',
      type: 'ai',
      title: 'Consulta PachAI: Valor y Acreditación de Entradas',
      detail: 'Respuesta automática generada informando gratuidad del evento',
      time: 'Hace 2 horas',
      icon: 'psychology',
      badgeClass: 'bg-purple-100 text-primary dark:bg-purple-950/60 dark:text-purple-300'
    },
    {
      id: 'act-5',
      type: 'auth',
      title: 'Inicio de Sesión Administrativo',
      detail: 'Sesión iniciada correctamente desde navegador de escritorio',
      time: 'Hace 3 horas',
      icon: 'verified_user',
      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    }
  ]);
}
