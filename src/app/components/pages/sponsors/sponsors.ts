import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SponsorData {
  id: string;
  name: string;
  role: string;
  badge: string;
  desc: string;
  img: string;
  website: string;
  layerClass: string;
  category?: 'organizador' | 'platino' | 'oro';
  hasLightContent?: boolean;
}

@Component({
  selector: 'app-sponsors',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sponsors.html',
  styleUrl: './sponsors.css'
})
export class Sponsors {
  public isExpanded: boolean = false;

  public toggleDesplegable(): void {
    this.isExpanded = !this.isExpanded;
  }

  // Matriz de Sponsors oficiales organizada en pirámide invertida (7 -> 4 -> 3)
  public col1Sponsors: SponsorData[] = [
    {
      id: 'capitan-cortez',
      name: 'CAPITAN CORTEZ',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'alianza estratégica de tres empresas, las cuales combinadas brindan un servicio integral para el transporte de cargas.',
      img: './img/sponsors/logo_ccgroup.webp',
      website: 'https://capitancortes.com/cc-group',
      layerClass: 'sponsor-layer-behind',
      category: 'platino'
    },
    {
      id: 'hierros-la-quiaca',
      name: 'HIERROS LA QUIACA',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'Líderes en acero con soluciones que trascienden.',
      img: './img/sponsors/logo_hlq.webp',
      website: 'https://hierroslaquiaca.com.ar/',
      layerClass: 'sponsor-layer-front',
      category: 'platino',
      hasLightContent: true
    },
    {
      id: 'madre-miga',
      name: 'MADRE MIGA',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'Panadería y pastelería artesanal...',
      img: './img/sponsors/logo_madre_miga.webp',
      website: 'https://www.instagram.com/madremigajujuy/',
      layerClass: 'sponsor-layer-behind',
      category: 'platino'
    },
    {
      id: 'viap',
      name: 'VIAP',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'Somos una empresa del NOA dedicada al diseño, fabricación, comercialización, distribución e instalación de módulos habitacionales.',
      img: './img/sponsors/logo_viap.webp',
      website: 'https://www.viap.com.ar/',
      layerClass: 'sponsor-layer-front',
      category: 'platino',
      hasLightContent: true
    },
    {
      id: 'transporte-atacama',
      name: 'TRANSPORTE ATACAMA',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'Servicios de logística y transporte regional...',
      img: './img/sponsors/logo_atacama.webp',
      website: 'https://www.instagram.com/atacamajujuy/?hl=en',
      layerClass: 'sponsor-layer-behind',
      category: 'platino'
    },
    {
      id: 'white',
      name: 'WHITE',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'Soluciones empresariales e innovación...',
      img: './img/sponsors/logo_white.webp',
      website: 'https://www.instagram.com/whitebs.ok/',
      layerClass: 'sponsor-layer-front',
      category: 'platino'
    },
    {
      id: 'antropo',
      name: 'ANTROPO',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'En diciembre del 2020, jóvenes apasionados por la vitivinicultura, crearon la primera bodega urbana de San Salvador de Jujuy: Antropo Wines.',
      img: './img/sponsors/logo_antropo_wines.webp',
      website: 'https://jarillawines.com/antropo-wines/',
      layerClass: 'sponsor-layer-behind',
      category: 'platino'
    }
  ];

  public col2Sponsors: SponsorData[] = [
    {
      id: 'grido',
      name: 'GRIDO',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'Cadena de heladerías con presencia regional...',
      img: './img/sponsors/logo_grido.webp',
      website: 'https://www.instagram.com/gridohelados/',
      layerClass: 'sponsor-layer-front',
      category: 'platino'
    },
    {
      id: 'joy',
      name: 'JOY',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'Todo lo que necesitás para viajar mejor',
      img: './img/sponsors/logo_JOY.webp',
      website: 'https://joyairline.com.ar/',
      layerClass: 'sponsor-layer-behind',
      category: 'platino'
    },
    {
      id: 'palpetrol',
      name: 'AXION-PALPETROL',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'En Palpetrol S.R.L., nos dedicamos a la comercialización de combustibles, lubricantes y productos relacionados. Con una trayectoria consolidada en el mercado, ofrecemos servicios y productos de alta calidad, respondiendo a las necesidades de nuestros clientes con eficiencia y compromiso.',
      img: './img/sponsors/logo_palpetrol.webp',
      website: 'https://www.instagram.com/palpetrolsrljujuy/',
      layerClass: 'sponsor-layer-front',
      category: 'platino'
    },
    {
      id: 'exincor',
      name: 'EXINCOR',
      role: '{GOLD SPONSOR}',
      badge: '{GOLD}',
      desc: 'Fabricamos cajas y envases de cartón CALIDAD, DISEÑO Y TECNOLOGÍA',
      img: './img/sponsors/logo_exincor.webp',
      website: 'https://exincor.com.ar/',
      layerClass: 'sponsor-layer-behind',
      category: 'oro'
    }
  ];

  public col3Sponsors: SponsorData[] = [
    {
      id: 'melius',
      name: 'MELIUS',
      role: '{GOLD SPONSOR}',
      badge: '{GOLD}',
      desc: 'Somos Melius, una consultora independiente formada por profesionales expertos en finanzas, cuya misión es brindar asesoramiento sobre inversiones en el mercado de valores',
      img: './img/sponsors/logo_melius.webp',
      website: 'https://meliusfinanzas.com.ar/',
      layerClass: 'sponsor-layer-front',
      category: 'oro',
      hasLightContent: true
    },
    {
      id: 'solci media',
      name: 'SOLCI MEDIA',
      role: '{GOLD SPONSOR}',
      badge: '{GOLD}',
      desc: 'Ronda de negocios y articulación comercial...',
      img: './img/sponsors/logo_SOLCI_MEDIA.webp',
      website: 'https://www.instagram.com/solci.media/',
      layerClass: 'sponsor-layer-behind',
      category: 'oro'
    },
    {
      id: 'compania-seguros',
      name: 'COMPAÑIA DE SEGUROS DE JUJUY',
      role: '{GOLD SPONSOR}',
      badge: '{GOLD}',
      desc: 'Aseguradora oficial de la provincia de Jujuy...',
      img: './img/sponsors/logo_campañia_seguros.webp',
      website: 'https://companiasegurosdejujuy.gob.ar/',
      layerClass: 'sponsor-layer-front',
      category: 'oro'
    },
    {
      id: 'BYD-logistic',
      name: 'BYD LOGISTIC',
      role: '{GOLD SPONSOR}',
      badge: '{GOLD}',
      desc: 'Soluciones de transporte y logística de alta precisión...',
      img: './img/sponsors/logo_byd.webp',
      website: 'https://bydlogistic.com.ar/',
      layerClass: 'sponsor-layer-front',
      category: 'oro'
    }
  ];

    public col4Sponsors: SponsorData[] = [

    {
      id: 'cfi',
      name: 'CFI',
      role: '{INSTITUTIONAL}',
      badge: '{INSTITUTIONAL}',
      desc: 'Organismo rector del comercio...',
      img: './img/sponsors/logo_CFI.webp',
      website: 'https://cfi.org.ar/',
      layerClass: 'sponsor-layer-behind',
      category: 'organizador'
    },
    {
      id: 'camara-arg-comercio',
      name: 'Camara de Comercio',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'Flota multimodal de transporte...',
      img: './img/sponsors/logo_Camara-comercio.webp',
      website: 'https://www.cac.com.ar/',
      layerClass: 'sponsor-layer-front',
      category: 'organizador'
    },
    {
      id: 'gobierno-jujuy',
      name: 'Gobierno de Jujuy',
      role: '{INSTITUTIONAL}',
      badge: '{INSTITUTIONAL}',
      desc: 'Ilustre Municipalidad de San Salvador de Jujuy',
      img: './img/sponsors/logo_municipalidad.webp',
      website: 'https://www.sansalvadordejujuy.gob.ar/',
      layerClass: 'sponsor-layer-behind',
      category: 'organizador'
    },
    {
      id: 'camara-comercio-exterior',
      name: 'Camara de Comercio Exterior',
      role: '{INSTITUTIONAL}',
      badge: '{INSTITUTIONAL}',
      desc: 'Ilustre Municipalidad de San Salvador de Jujuy',
      img: './img/sponsors/logo_camaradecomercioexterior.webp',
      website: 'https://camcomexjujuy.com.ar/',
      layerClass: 'sponsor-layer-behind',
      category: 'organizador'
    }
  ];

  // Clasificación de listas estáticas en memoria
  public get organizadores(): SponsorData[] {
    return [...this.col1Sponsors, ...this.col2Sponsors, ...this.col3Sponsors, ...this.col4Sponsors].filter(s => s.category === 'organizador');
  }

  public get platino(): SponsorData[] {
    return [...this.col1Sponsors, ...this.col2Sponsors, ...this.col3Sponsors, ...this.col4Sponsors].filter(s => s.category === 'platino');
  }

  public get oro(): SponsorData[] {
    return [...this.col1Sponsors, ...this.col2Sponsors, ...this.col3Sponsors, ...this.col4Sponsors].filter(s => s.category === 'oro');
  }

  public sponsorUrl(sponsor: SponsorData): string {
    const raw = (sponsor.website ?? '').trim();
    if (!raw) return '';
    if (/^(mailto:|tel:)/i.test(raw)) return raw;
    if (/^(https?:)?\/\//i.test(raw)) {
      return `https://${raw.replace(/^(https?:)?\/\//i, '')}`;
    }
    if (raw.startsWith('/')) return '';
    return `https://${raw}`;
  }
}