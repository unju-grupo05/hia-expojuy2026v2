import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-novedades',
  standalone: true,
  templateUrl: './novedades.component.html',
  styleUrl: './novedades.component.css'
})
export class NovedadesComponent implements AfterViewInit {
  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initNewsModal();
  }

  private initNewsModal(): void {
    const modal = document.getElementById('news-modal');
    const backdrop = document.getElementById('news-modal-backdrop');
    const closeBtn = document.getElementById('news-modal-close');
    const shareBtn = document.getElementById('news-modal-share');
    const copyBtn = document.getElementById('news-modal-copy');
    if (!modal) return;

    const NEWS: Record<string, { img: string; badge: string; date: string; title: string; body: string[] }> = {
      bioceanico: {
        img: './Img/ExpoJuy-1.webp',
        badge: 'Infraestructura',
        date: '09 Octubre 2026',
        title: 'Somos Desarrollo, Potencia & Futuro',
        body: [
          'Se realizar\u00e1 en el predio de la Ciudad Cultural',
          'Ejes centrales de la exposici\u00f3n: *Rondas de Negocios e Innovaci\u00f3n: Espacios de vinculaci\u00f3n empresarial, digitalizaci\u00f3n aduanera, agrotecnolog\u00eda, log\u00edstica y energ\u00edas renovables.'
        ]
      },
      cauchari: {
        img: './Img/Cauchari.jpg',
        badge: 'Energ\u00edas Limpias',
        date: '02 Agosto 2026',
        title: 'El Parque Solar Cauchari expondr\u00e1 sus proyectos de expansi\u00f3n e hidr\u00f3geno verde en el Pabell\u00f3n de Energ\u00edas',
        body: [
          'El Parque Solar Cauchari, el mayor de su tipo a gran altura del mundo, presentar\u00e1 en el Pabell\u00f3n de Energ\u00edas sus nuevas fases de expansi\u00f3n y la hoja de ruta para la producci\u00f3n de hidr\u00f3geno verde en la Puna.',
          'La iniciativa apunta a atraer inversores globales y cerrar acuerdos de suministro de energ\u00eda limpia con industrias de litio y miner\u00eda sustentable durante los d\u00edas de la feria.'
        ]
      },
      ventanilla: {
        img: './Img/Expojuy-8.webp',
        badge: 'Innovaci\u00f3n',
        date: '11 Octubre 2026',
        title: 'Presentar\u00e1n sistema de ventanilla \u00fanica digital para acelerar el comercio fronterizo',
        body: [
          'Se dar\u00e1 a conocer una plataforma digital que centralizar\u00e1 los tr\u00e1mites de importaci\u00f3n y exportaci\u00f3n en pasos fronterizos integrados de la regi\u00f3n.',
          'Reducci\u00f3n de hasta un 40% en los tiempos de cruce y trazabilidad de cargas en l\u00ednea (pruebas piloto en el \u00faltimo trimestre del a\u00f1o).'
        ]
      }
    };

    const refs = {
      image: document.getElementById('news-modal-image') as HTMLImageElement | null,
      badge: document.getElementById('news-modal-badge'),
      date: document.getElementById('news-modal-date'),
      title: document.getElementById('news-modal-title'),
      body: document.getElementById('news-modal-body')
    };

    const openNews = (key: string) => {
      const n = NEWS[key];
      if (!n) return;
      if (refs.image) { refs.image.src = n.img; refs.image.alt = n.title; }
      if (refs.badge) refs.badge.textContent = n.badge;
      if (refs.date) refs.date.textContent = n.date;
      if (refs.title) refs.title.textContent = n.title;
      if (refs.body) {
        refs.body.innerHTML = '';
        n.body.forEach(par => {
          const p = document.createElement('p');
          p.textContent = par;
          refs.body!.appendChild(p);
        });
      }
      modal.classList.add('news-modal-open');
      document.body.style.overflow = 'hidden';
    };

    const closeNews = () => {
      modal.classList.remove('news-modal-open');
      document.body.style.overflow = '';
    };

    document.querySelectorAll('.news-card').forEach((card) => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-news');
        if (key) openNews(key);
      });
      card.addEventListener('keydown', (e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter' || ke.key === ' ') {
          ke.preventDefault();
          const key = card.getAttribute('data-news');
          if (key) openNews(key);
        }
      });

      let spotRaf: number | null = null;
      card.addEventListener('mousemove', (e: Event) => {
        const me = e as MouseEvent;
        if (spotRaf) return;
        spotRaf = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          (card as HTMLElement).style.setProperty('--mouse-x', (me.clientX - rect.left) + 'px');
          (card as HTMLElement).style.setProperty('--mouse-y', (me.clientY - rect.top) + 'px');
          spotRaf = null;
        });
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeNews);
    if (backdrop) backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeNews(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('news-modal-open')) closeNews();
    });

    const copyLink = (btn: HTMLElement, label: string) => {
      const url = window.location.href.split('#')[0] + '#noticias';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> <span>Enlace copiado</span>';
          setTimeout(() => { btn.innerHTML = '<span class="material-symbols-outlined text-sm">link</span> <span>' + label + '</span>'; }, 2500);
        });
      }
    };

    if (shareBtn) shareBtn.addEventListener('click', () => {
      const url = window.location.href.split('#')[0] + '#noticias';
      if (navigator.share) {
        navigator.share({ title: document.title, url }).catch(() => {});
      } else {
        copyLink(shareBtn, 'Compartir novedad');
      }
    });
    if (copyBtn) copyBtn.addEventListener('click', () => copyLink(copyBtn, 'Copiar enlace'));
  }
}