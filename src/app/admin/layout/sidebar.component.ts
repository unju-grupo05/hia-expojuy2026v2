import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule, RouterLink, RouterLinkActive],
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
      icon: 'feed',
      badge: 'CMS',
      badgeColor: 'bg-purple-100 text-primary dark:bg-purple-900/40 dark:text-purple-300'
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
