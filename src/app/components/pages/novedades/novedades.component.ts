import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface NewsItem {
  img: string;
  badge: string;
  date: string;
  title: string;
  body: string[];
}

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './novedades.component.html',
  styleUrl: './novedades.component.css'
})
export class NovedadesComponent {
  public currentSlide = 0;
  private totalSlides = 2;

  public isModalOpen = false;
  public copySuccess = false;

  public newsDb: Record<string, NewsItem> = {
    bioceanico: {
      img: './Img/ExpoJuy-1.webp',
      badge: 'Inauguración',
      date: '09 Octubre 2026',
      title: 'Jujuy da inicio a su tradicional ExpoJuy en su edición 2026',
      body: [
        'Se realizará en el predio de la Ciudad Cultural con la presencia de delegaciones internacionales.',
        'Ejes centrales: Rondas de Negocios e Innovación, vinculación empresarial, digitalización aduanera, agrotecnología, logística y energías renovables.'
      ]
    },
    cauchari: {
      img: './Img/Cauchari.jpg',
      badge: 'Energías Limpias',
      date: '02 Agosto 2026',
      title: 'El Parque Solar Cauchari expondrá sus proyectos de expansión e hidrógeno verde',
      body: [
        'El Parque Solar Cauchari, el mayor de su tipo a gran altura del mundo, presentará en el Pabellón de Energías sus nuevas fases de expansión y la hoja de ruta para la producción de hidrógeno verde en la Puna.',
        'La iniciativa apunta a atraer inversores globales y cerrar acuerdos de suministro de energía limpia con industrias de litio y minería sustentable.'
      ]
    },
    ventanilla: {
      img: './Img/Expojuy-8.webp',
      badge: 'Aduana Digital',
      date: '11 Octubre 2026',
      title: 'Ventanilla única digital para acelerar el comercio fronterizo',
      body: [
        'Se dará a conocer una plataforma digital que centralizará los trámites de importación y exportación en pasos fronterizos integrados de la región.',
        'Reducción de hasta un 40% en los tiempos de cruce y trazabilidad de cargas en línea.'
      ]
    }
  };

  public activeNews: NewsItem = this.newsDb['bioceanico'];

  public nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
  }

  public prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
  }

  public openNewsModal(key: string): void {
    if (this.newsDb[key]) {
      this.activeNews = this.newsDb[key];
      this.isModalOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  public closeNewsModal(): void {
    this.isModalOpen = false;
    this.copySuccess = false;
    document.body.style.overflow = '';
  }

  public shareNews(): void {
    const url = window.location.href.split('#')[0] + '#novedades';
    if (navigator.share) {
      navigator.share({ title: this.activeNews.title, url }).catch(() => {});
    } else {
      this.copyLink();
    }
  }

  public copyLink(): void {
    const url = window.location.href.split('#')[0] + '#novedades';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.copySuccess = true;
        setTimeout(() => (this.copySuccess = false), 2500);
      });
    }
  }
}