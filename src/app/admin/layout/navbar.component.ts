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
    if (url.includes('/admin/posts')) {
      return {
        title: 'Publicaciones y Noticias',
        subtitle: 'Administra comunicados con jerarquía visual y live preview'
      };
    }
    if (url.includes('/admin/stands')) {
      return {
        title: 'Stands & Directorio de Expositores',
        subtitle: 'Gestión de empresas, asignación de pabellones y visibilidad'
      };
    }
    if (url.includes('/admin/agenda')) {
      return {
        title: 'Cronograma & Agenda Oficial',
        subtitle: 'Planificación de paneles, foros y actividades por auditorio'
      };
    }
    if (url.includes('/admin/pillars')) {
      return {
        title: 'Pilares Estratégicos & Ejes 2026',
        subtitle: 'Gestión de los ejes temáticos institucionales de ExpoJuy'
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

  /**
   * Iniciales del administrador para mostrar cuando el backend no aporta un avatar.
   * Evita depender de un servicio externo de imágenes.
   */
  public userInitials(): string {
    const nombre = this.authService.currentUser()?.name?.trim() || '';
    if (!nombre) {
      return 'AD';
    }
    const partes = nombre.split(/\s+/).filter(Boolean);
    const iniciales = partes
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
    return iniciales || 'AD';
  }
}
