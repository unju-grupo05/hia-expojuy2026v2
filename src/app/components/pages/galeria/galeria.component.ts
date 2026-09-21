import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-galeria',
  standalone: true,
  templateUrl: './galeria.component.html',
  styleUrl: './galeria.component.css'
})
export class GaleriaComponent implements AfterViewInit {
  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initAccordionGallery();
  }

  private initAccordionGallery(): void {
    // Sincronizado con id="gallery-accordion"
    const gallery = document.getElementById('gallery-accordion');
    if (!gallery) return;

    // Sincronizado con clase .gallery-ac-item
    const cards = Array.from(gallery.querySelectorAll('.gallery-ac-item')) as HTMLElement[];
    if (!cards.length) return;

    // Marcar la primera tarjeta como activa por defecto
    if (!gallery.querySelector('.gallery-ac-item.is-active')) {
      cards[0].classList.add('is-active');
      cards[0].setAttribute('aria-selected', 'true');
    }

    const setActive = (targetCard: HTMLElement) => {
      cards.forEach(card => {
        const isCurrent = card === targetCard;
        // Alternar clase .is-active que usa el CSS
        card.classList.toggle('is-active', isCurrent);
        card.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });
    };

    cards.forEach(card => {
      card.addEventListener('mouseenter', () => setActive(card));
      card.addEventListener('focus', () => setActive(card));
      card.addEventListener('click', () => setActive(card));
    });
  }
}