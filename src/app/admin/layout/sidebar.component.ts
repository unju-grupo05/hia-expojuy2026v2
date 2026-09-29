import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconHrefPipe } from '../../shared/icon-href.pipe';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconHrefPipe],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  public isMobileOpen = input<boolean>(false);
  public closeSidebar = output<void>();

  public readonly navItems: NavItem[] = [
    {
      label: 'Métricas',
      route: '/admin/metrics',
      icon: 'dashboard_customize',
      badge: 'KPI',
      badgeColor: 'bg-brand-cyan-electric/20 text-brand-cyan-accessible dark:text-brand-cyan-electric'
    },
    {
      label: 'Publicaciones',
      route: '/admin/posts',
      icon: 'rss_feed',
      badge: 'CMS',
      badgeColor: 'bg-purple-100 text-primary dark:bg-purple-900/40 dark:text-purple-300'
    },
    {
      label: 'Stands',
      route: '/admin/stands',
      icon: 'storefront',
      badge: 'B2B',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
    },
    {
      label: 'Agenda',
      route: '/admin/agenda',
      icon: 'event_note',
      badge: 'Eventos',
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
    },
    {
      label: 'Pilares',
      route: '/admin/pillars',
      icon: 'interests',
      badge: 'Ejes',
      badgeColor: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300'
    },
    {
      label: 'Imágenes',
      route: '/admin/media',
      icon: 'perm_media',
      badge: 'CDN',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    }
  ];

  public onNavClick(): void {
    this.closeSidebar.emit();
  }
}
