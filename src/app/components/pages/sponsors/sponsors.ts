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
}

@Component({
  selector: 'app-sponsors',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sponsors.html',
  styleUrl: './sponsors.css'
})
export class Sponsors {
  // Matriz de marcas / Sponsors oficiales
  public col1Sponsors: SponsorData[] = [
    {
      id: 'exar',
      name: 'Exar',
      role: '{MAIN DIAMOND}',
      badge: '{MAIN DIAMOND}',
      desc: 'Líder mundial en tecnologías de litio y extracción sustentable en la Puna jujeña, acelerando la transición energética y almacenamiento de nueva generación.',
      img: './img/sponsors/1-Exar.webp',
      website: 'https://expojuy.com.ar',
      layerClass: 'sponsor-layer-behind'
    },
    {
      id: 'compania-seguros',
      name: 'Compañia de Seguros',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'Alianza de integración subcontinental que promueve el comercio exterior, la conectividad logística y el desarrollo de la Zona de Integración del Centro Oeste Sudamericano.',
      img: './img/sponsors/2-Compañia-Seguros.webp',
      website: 'https://expojuy.com.ar',
      layerClass: 'sponsor-layer-front'
    },
    {
      id: 'cannava',
      name: 'Cannava',
      role: '{GLOBAL PARTNER}',
      badge: '{GLOBAL PARTNER}',
      desc: 'Operador del parque solar Cauchari, uno de los más altos y eficientes del planeta, impulsando la descarbonización industrial en el Cono Sur.',
      img: './img/sponsors/3-cannava.webp',
      website: 'https://expojuy.com.ar',
      layerClass: 'sponsor-layer-behind'
    }
  ];

  public col2Sponsors: SponsorData[] = [
    {
      id: 'kelimpio',
      name: 'Kelimpio',
      role: '{MAIN DIAMOND}',
      badge: '{MAIN DIAMOND}',
      desc: 'Entidad financiera multilateral que canaliza capital estratégico en infraestructura portuaria, ferrocarril y corredores bioceánicos de Sudamérica.',
      img: './img/sponsors/4-Kelimpio.webp',
      website: 'https://expojuy.com.ar',
      layerClass: 'sponsor-layer-front'
    },
    {
      id: 'jujuyacompaña',
      name: 'Jujuy Acompaña',
      role: '{GOLD SPONSOR}',
      badge: '{GOLD SPONSOR}',
      desc: 'Infraestructura en la nube soberana con centros de datos de alta eficiencia energética, computación cuántica y ciberseguridad para el sector corporativo.',
      img: './img/sponsors/5-jujuyacompaña.webp',
      website: 'https://expojuy.com.ar',
      layerClass: 'sponsor-layer-behind'
    },
    {
      id: 'municipalidad',
      name: 'Municipalidad',
      role: '{TECH PARTNER}',
      badge: '{TECH PARTNER}',
      desc: 'Soluciones de telemetría IoT, robótica autónoma y analítica predictiva diseñadas para la extracción mineral de huella cero y máxima seguridad operativa.',
      img: './img/sponsors/6-municipalidad.webp',
      website: 'https://expojuy.com.ar',
      layerClass: 'sponsor-layer-front'
    }
  ];

  public col3Sponsors: SponsorData[] = [
    {
      id: 'cfi',
      name: 'CFI',
      role: '{INSTITUTIONAL}',
      badge: '{INSTITUTIONAL}',
      desc: 'Organismo rector que potencia el comercio internacional del Noroeste Argentino con los mercados del Asia-Pacífico y el Mercosur ampliado.',
      img: './img/sponsors/7-CFI.webp',
      website: 'https://expojuy.com.ar',
      layerClass: 'sponsor-layer-behind'
    },
    {
      id: 'camara-comercio',
      name: 'Camara de Comercio',
      role: '{PLATINUM SPONSOR}',
      badge: '{PLATINUM}',
      desc: 'Flota multimodal de transporte bioceánico por el Paso de Jama hacia puertos chilenos, garantizando tiempos récord y trazabilidad integral.',
      img: './img/sponsors/8-Camara-comercio.webp',
      website: 'https://expojuy.com.ar',
      layerClass: 'sponsor-layer-front'
    },
    {
      id: 'secretaria-turismo',
      name: 'Secretaria de Turismo',
      role: '{CREATIVE PARTNER}',
      badge: '{CREATIVE}',
      desc: 'Ecosistema de innovación tecnológica y economía del conocimiento jujeña que incuba startups y proyectos de software de exportación.',
      img: './img/sponsors/9-secretaria-turismo.webp',
      website: 'https://expojuy.com.ar',
      layerClass: 'sponsor-layer-behind'
    }
  ];

  //normaliza la URL del sponsor para que siempre sea absoluta y externa.
  public sponsorUrl(sponsor: SponsorData): string {
    const raw = (sponsor.website ?? '').trim();
    if (!raw) return '';

    if (/^(mailto:|tel:)/i.test(raw)) return raw;

    // Protocolo-relative (`//host`) o esquema explícito (`http(s)://host`).
    if (/^(https?:)?\/\//i.test(raw)) {
      return `https://${raw.replace(/^(https?:)?\/\//i, '')}`;
    }

    // Ruta interna: no debe convertirse en enlace externo.
    if (raw.startsWith('/')) return '';

    return `https://${raw}`;
  }
}