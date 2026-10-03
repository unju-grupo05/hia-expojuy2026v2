import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { UiChromeService } from '../../../core/ui-chrome.service';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './portal-layout.component.html',
})
export class PortalLayoutComponent implements OnInit, OnDestroy {
  protected readonly chrome = inject(UiChromeService);

  /** Puntos del side-rail; el estado activo se resuelve con `activeSection()`. */
  protected readonly railItems: ReadonlyArray<{ id: string; title: string; label: string }> = [
    { id: 'hero-section', title: 'Inicio', label: 'Inicio' },
    { id: 'sobre-expojuy', title: 'Pilares', label: 'Ejes 2026' },
    { id: 'mapa', title: 'Donde estamos', label: 'Ubicacion' },
    { id: 'expositores', title: 'Expositores', label: 'Expositores' },
    { id: 'agenda', title: 'Agenda', label: 'Agenda' },
    { id: 'novedades', title: 'Novedades', label: 'Novedades' },
    { id: 'galeria', title: 'Galería', label: 'Galería' }
  ];

  ngOnInit(): void {
    this.chrome.initTheme();
    this.chrome.startReadingTracker();
  }

  ngOnDestroy(): void {
    this.chrome.stopReadingTracker();
    this.chrome.closeMobileMenu();
  }

  protected isActiveSection(navTarget: string): boolean {
    return this.chrome.activeSection() === navTarget;
  }

  protected onRailClick(event: Event, sectionId: string): void {
    event.preventDefault();
    this.chrome.closeMobileMenu();
    this.chrome.scrollTo(`#${sectionId}`);
  }
}
