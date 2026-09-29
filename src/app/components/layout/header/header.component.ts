import { Component, inject } from '@angular/core';
import { UiChromeService } from '../../../core/ui-chrome.service';
import { IconHrefPipe } from '../../../shared/icon-href.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IconHrefPipe],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  protected readonly chrome = inject(UiChromeService);

  /** Enlaces del menu movil, navegados con scroll suave. */
  protected readonly mobileLinks: ReadonlyArray<{ href: string; icon: string; label: string }> = [
    { href: '#hero-section', icon: 'home', label: 'Inicio' },
    { href: '#sobre-expojuy', icon: 'pacemaker', label: 'Ejes 2026' },
    { href: '#mapa', icon: 'location_on', label: 'Ubicación' },
    { href: '#expositores', icon: 'storefront', label: 'Expositores' },
    { href: '#agenda', icon: 'calendar_month', label: 'Agenda' },
    { href: '#novedades', icon: 'newspaper', label: 'Novedades' },
    { href: '#galeria', icon: 'photo_library', label: 'Galería' }
  ];

  protected isActiveSection(href: string): boolean {
    return this.chrome.activeSection() === href.replace(/^#/, '');
  }

  protected toggleTheme(): void {
    this.chrome.toggleTheme();
  }

  protected toggleMobileMenu(): void {
    this.chrome.toggleMobileMenu();
  }

  protected onMobileNavClick(event: Event, href: string): void {
    this.chrome.onMobileNavClick(event, href);
  }
}
