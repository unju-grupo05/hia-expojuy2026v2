import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ElementRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
  selector: 'app-acreditaciones-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './acreditaciones-faq.html',
  styleUrl: './acreditaciones-faq.css'
})
export class AcreditacionesFaq implements OnInit, AfterViewInit {

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private el: ElementRef
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initScrollReveal();
  }

  // Permite que las animaciones reveal-on-scroll funcionen en este componente
  private initScrollReveal(): void {
    const reveals = this.el.nativeElement.querySelectorAll('.reveal-on-scroll');
    if (!reveals.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      reveals.forEach((element: Element) => observer.observe(element));
    } else {
      reveals.forEach((element: Element) => element.classList.add('is-visible'));
    }
  }

  // Alterna el despliegue del acordeón FAQ
  public toggleFaq(event: Event): void {
    const btn = (event.target as HTMLElement).closest('button');
    if (!btn) return;

    const item = btn.closest('.faq-item');
    if (!item) return;

    const body = item.querySelector('.faq-answer') as HTMLElement | null;
    const icon = btn.querySelector('.faq-icon') as HTMLElement | null;
    if (!body) return;

    const isOpen = item.classList.contains('active');
    const nativeEl = this.el.nativeElement as HTMLElement;

    // Cerrar todas las respuestas abiertas
    nativeEl.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('active');
      const b = i.querySelector('.faq-answer') as HTMLElement | null;
      const ic = i.querySelector('.faq-icon') as HTMLElement | null;
      if (b) b.style.maxHeight = '0px';
      if (ic) ic.style.transform = 'rotate(0deg)';
    });

    // Si estaba cerrada, la abrimos
    if (!isOpen) {
      item.classList.add('active');
      body.style.maxHeight = body.scrollHeight + 'px';
      if (icon) icon.style.transform = 'rotate(180deg)';
    }
  }
}