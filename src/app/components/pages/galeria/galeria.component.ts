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
    const gallery = document.getElementById('accordion-gallery');
    if (!gallery) return;

    const cards = Array.from(gallery.querySelectorAll('.acc-card')) as HTMLElement[];
    if (!cards.length) return;

    const setActive = (targetCard: HTMLElement) => {
      cards.forEach(card => {
        const isCurrent = card === targetCard;
        card.classList.toggle('acc-card-active', isCurrent);
        card.setAttribute('aria-expanded', isCurrent ? 'true' : 'false');
      });
    };

    cards.forEach(card => {
      card.addEventListener('mouseenter', () => setActive(card));
      card.addEventListener('focus', () => setActive(card));
      card.addEventListener('click', () => setActive(card));
    });
  }
}