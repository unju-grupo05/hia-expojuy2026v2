import { Component, inject, output, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  public authService = inject(AuthService);
  private router = inject(Router);

  public toggleMobileSidebar = output<void>();

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  public sectionInfo = computed(() => {
    const url = this.currentUrl();
    if (url.includes('/admin/metrics')) {
      return {
        title: 'Métricas del Evento',
        subtitle: 'Resumen ejecutivo de actividad, consultas y contenidos'
      };
    }
    if (url.includes('/admin/posts')) {
      return {
        title: 'Publicaciones y Noticias',
        subtitle: 'Administra los comunicados, lanzamientos y artículos'
      };
    }
    if (url.includes('/admin/media')) {
      return {
        title: 'Biblioteca de Imágenes',
        subtitle: 'Galería de fotos, stands y recursos para la web'
      };
    }
    return {
      title: 'Panel de Administración',
      subtitle: 'Gestor CMS oficial de ExpoJuy 2026'
    };
  });

  public onLogout(): void {
    this.authService.logout();
  }
}
