import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface Exhibitor {
  id: string;
  name: string;
  stand: string;
  category: 'mineria' | 'energia' | 'agro' | 'tecnologia' | 'logistica';
  subtitle: string;
  description: string;
  origin: string;
  verified?: boolean;
}

export interface ExhibitorResponse {
  items: Exhibitor[];
  total: number;
  hasMore: boolean;
  page: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExhibitorService {
  private readonly allExhibitors: Exhibitor[] = [
    {
      id: 'ex-1',
      name: 'Jujuy Lithium Corporation',
      stand: 'Stand A-12 · Pab. Minería',
      category: 'mineria',
      subtitle: 'Carbonato de Litio Grado Batería',
      description: 'Pioneros en extracción directa DLE con consumo hídrico optimizado y trazabilidad con huella de carbono neutral.',
      origin: 'Argentina',
      verified: true
    },
    {
      id: 'ex-2',
      name: 'Cauchari Solar Solutions',
      stand: 'Stand E-04 · Pab. Energías',
      category: 'energia',
      subtitle: 'Generación & BESS a 4.000 msnm',
      description: 'Ingeniería avanzada para microredes aisladas y suministro de energía limpia para complejos mineros en la Puna.',
      origin: 'Consorcio Binacional',
      verified: true
    },
    {
      id: 'ex-3',
      name: 'BioAndes AgroTech',
      stand: 'Stand B-22 · Pab. Agro',
      category: 'agro',
      subtitle: 'Biotecnología & Cítricos Orgánicos',
      description: 'Desarrollo de bioinsumos microbianos para cultivos de caña de azúcar, cítricos de exportación y tabaco premium.',
      origin: 'Jujuy / Salta',
      verified: true
    },
    {
      id: 'ex-4',
      name: 'Quebrada Tech Labs',
      stand: 'Stand T-09 · Pab. B2B',
      category: 'tecnologia',
      subtitle: 'IA & Automatización Industrial',
      description: 'Plataformas SaaS para monitoreo satelital de transportes en el Paso de Jama y telemetría de yacimientos.',
      origin: 'Argentina',
      verified: true
    },
    {
      id: 'ex-5',
      name: 'TransPacífico Multimodal',
      stand: 'Stand L-18 · Pab. Internacional',
      category: 'logistica',
      subtitle: 'Flota de Carga & Aduanas Integradas',
      description: 'Operador logístico integral con base en San Salvador de Jujuy, Antofagasta e Iquique para cargas marítimas a China.',
      origin: 'Chile / Argentina',
      verified: true
    },
    {
      id: 'ex-6',
      name: 'Misión Comercial ZICOSUR',
      stand: 'Stand INT-02 · Pab. Internacional',
      category: 'tecnologia',
      subtitle: 'Integración Regional Multilateral',
      description: 'Delegación institucional conformada por estados y provincias de Argentina, Brasil, Bolivia, Chile, Paraguay y Perú.',
      origin: 'Multilateral',
      verified: true
    },
    {
      id: 'ex-7',
      name: 'Sales de Jujuy & Toyota Tsusho',
      stand: 'Stand A-08 · Pab. Minería',
      category: 'mineria',
      subtitle: 'Cadena Global de Valor Electro-Movilidad',
      description: 'Planta de producción de carbonato de litio en el Salar de Olaroz con certificación internacional IRMA de minería responsable.',
      origin: 'Argentina / Japón',
      verified: true
    },
    {
      id: 'ex-8',
      name: 'Puna Clean H2 & Solar',
      stand: 'Stand E-11 · Pab. Energías',
      category: 'energia',
      subtitle: 'Hidrógeno Verde Andino',
      description: 'Proyectos piloto de electrolizadores de gran escala alimentados por radiación fotovoltaica extrema de altura.',
      origin: 'Alemania / Argentina',
      verified: true
    },
    {
      id: 'ex-9',
      name: 'Valles Altos Bodegas & Fincas',
      stand: 'Stand B-15 · Pab. Agro',
      category: 'agro',
      subtitle: 'Vinos de Extrema Altura (2.200 a 3.300 msnm)',
      description: 'Producción vitivinícola boutique de alta gama en la Quebrada de Humahuaca con denominación de origen protegida.',
      origin: 'Jujuy, Argentina',
      verified: true
    },
    {
      id: 'ex-10',
      name: 'Bioceánico Rail Logistics',
      stand: 'Stand L-05 · Pab. Logística',
      category: 'logistica',
      subtitle: 'Tren Belgrano Cargas & Conexión Ferroviaria',
      description: 'Soluciones intermodales tren-camión conectando los puertos del Atlántico (Santos/Rosario) con el Pacífico (Mejillones).',
      origin: 'Cono Sur',
      verified: true
    },
    {
      id: 'ex-11',
      name: 'Andean Quantum Systems',
      stand: 'Stand T-14 · Pab. B2B',
      category: 'tecnologia',
      subtitle: 'Ciberseguridad en Infraestructura Crítica',
      description: 'Monitoreo de redes SCADA y gemelos digitales para gasoductos, parques solares y subestaciones eléctricas.',
      origin: 'Argentina',
      verified: true
    },
    {
      id: 'ex-12',
      name: 'Exar Minera & Ganfeng',
      stand: 'Stand A-15 · Pab. Minería',
      category: 'mineria',
      subtitle: 'Cauchari-Olaroz Lithium Facility',
      description: 'Uno de los mayores yacimientos de salmuera de litio del mundo con procesos de evaporación solar de ciclo cerrado.',
      origin: 'Argentina / China / Canadá',
      verified: true
    },
    {
      id: 'ex-13',
      name: 'Cannava Pharma Jujuy',
      stand: 'Stand B-03 · Pab. Agro',
      category: 'agro',
      subtitle: 'Biotecnología y Cannabis Medicinal',
      description: 'Primer complejo estatal integral de cultivo científico, extracción y producción de cannabinoides grado farmacéutico GMP.',
      origin: 'Jujuy, Argentina',
      verified: true
    },
    {
      id: 'ex-14',
      name: 'Andes Cloud Grid',
      stand: 'Stand T-03 · Pab. B2B',
      category: 'tecnologia',
      subtitle: 'Edge Computing & Data Centers Verdes',
      description: 'Centros de datos enfriados naturalmente por clima de puna y energizados 100% con granjas solares locales.',
      origin: 'Argentina',
      verified: true
    },
    {
      id: 'ex-15',
      name: 'Puerto Seco Perico & Zona Franca',
      stand: 'Stand L-01 · Pab. Logística',
      category: 'logistica',
      subtitle: 'Hub Logístico Aduanero del NOA',
      description: 'Parque industrial con exenciones fiscales, depósito aduanero y conexión directa al aeropuerto Horacio Guzmán.',
      origin: 'Jujuy, Argentina',
      verified: true
    },
    {
      id: 'ex-16',
      name: 'Y-TEC & Litio para el Futuro',
      stand: 'Stand A-20 · Pab. Minería',
      category: 'mineria',
      subtitle: 'Celdas de Batería Nacionales',
      description: 'Innovación tecnológica conjunta YPF-CONICET para la fabricación de celdas de ion-litio y material catódico.',
      origin: 'Argentina',
      verified: true
    },
    {
      id: 'ex-17',
      name: 'Geotermia Tuzgle Energy',
      stand: 'Stand E-08 · Pab. Energías',
      category: 'energia',
      subtitle: 'Aprovechamiento Entálpico Volcánico',
      description: 'Estudios de factibilidad y perforaciones profundas en el volcán Tuzgle para suministro de energía de base 24/7.',
      origin: 'Jujuy, Argentina',
      verified: true
    },
    {
      id: 'ex-18',
      name: 'Jama Cargo Express',
      stand: 'Stand L-22 · Pab. Logística',
      category: 'logistica',
      subtitle: 'Transporte Criogénico y Químicos Mineros',
      description: 'Flota especializada en transporte de carbonato de litio, soda cáustica y reactivos con certificación ISO 39001.',
      origin: 'Argentina / Chile',
      verified: true
    }
  ];

  getExhibitors(options: {
    page: number;
    pageSize: number;
    category: string;
    search: string;
  }): Observable<ExhibitorResponse> {
    const { page, pageSize, category, search } = options;

    let filtered = this.allExhibitors;

    if (category && category !== 'all') {
      filtered = filtered.filter(item => item.category === category);
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.stand.toLowerCase().includes(q) ||
        item.origin.toLowerCase().includes(q)
      );
    }

    const startIndex = (page - 1) * pageSize;
    const items = filtered.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < filtered.length;

    // Simula latencia de red realista de 450ms
    return of({
      items,
      total: filtered.length,
      hasMore,
      page
    }).pipe(delay(450));
  }
}
