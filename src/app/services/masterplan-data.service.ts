import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, expand, reduce } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BlenderPayload, CommercialStatus, PointOfInterest, StandData } from '../components/models/stand.model';
import { SectorActivity } from '../components/models/sector-info.model';
import { ExpositorApi } from './apiExpositores.service';
import { Expositor } from '../models/expositor.model';
import { PaginatedResponse } from '../models/api-response.model';

/**
 * El masterplan ya no mantiene su propio shape de expositor: consume el
 * contrato unico `Expositor` de `GET /api/expositores`.
 */
export type ExpositorRecord = Expositor;

@Injectable({
  providedIn: 'root'
})
export class MasterplanDataService {
  private readonly expositorApi = inject(ExpositorApi);

  // Estado Reactivo con Angular Signals
  public selectedStand = signal<StandData | null>(null);
  public activeFilter = signal<string>('all');
  public searchQuery = signal<string>('');

  /** Expositores reales de PostgreSQL, cargados desde `/api/expositores`. */
  public readonly expositores = signal<ExpositorRecord[]>([]);
  public readonly isLoadingExpositores = signal<boolean>(false);

  /**
   * Se incrementa cada vez que llegan datos de la BD.
   *
   * La geometría de los stands proviene de Blender y no cambia, pero `company`,
   * `status` y `desc` sí se actualizan desde la base. Como Three.js conserva la
   * referencia de cada objeto `StandData`, los stands se mutan en el sitio; este
   * contador es la dependencia que obliga a las vistas a recalcularse.
   */
  public readonly dataVersion = signal(0);

  /** Catálogo de stands YA procesado, para no recalcularlo en cada lectura. */
  private standsCache: StandData[] | null = null;

  constructor() {
    this.cargarExpositores();
  }

  public readonly SECTOR_ACTIVITIES: Record<string, SectorActivity[]> = {
    cubierto: [
      { nombre: 'Cumbre del Triángulo del Litio & Energías Limpias', hora: '14:00 - 16:30', dia: '09 Oct' },
      { nombre: 'Panel de Innovación Tecnológica del NOA', hora: '10:00 - 12:00', dia: '10 Oct' },
      { nombre: 'Mesa de Comercio Exterior e Inversiones', hora: '16:00 - 18:00', dia: '11 Oct' }
    ],
    corporativo: [
      { nombre: 'Mesa de Inversiones Estratégicas y Sustentabilidad', hora: '11:00 - 13:30', dia: '10 Oct' },
      { nombre: 'Ronda Internacional de Negocios Mineros', hora: '15:00 - 18:00', dia: '11 Oct' }
    ],
    artesano: [
      { nombre: 'Taller Vivo de Hilado y Teñido en Lana de Llama', hora: '11:00 - 13:00', dia: '09-11 Oct' },
      { nombre: 'Muestra de Alfarería y Técnicas Ancestrales', hora: '15:30 - 17:30', dia: '09 Oct' }
    ],
    descubierto: [
      { nombre: 'Demostración Dinámica de Maquinaria y Minería', hora: '15:00 - 17:00', dia: '09 Oct' },
      { nombre: 'Test Drive de Vehículos 4x4 y Utilitarios Eléctricos', hora: '11:00 - 18:00', dia: '10 Oct' }
    ],
    gastronomico: [
      { nombre: 'Masterclass de Cocina Regional & Humitas Andinas', hora: '13:00 - 14:30', dia: '09 Oct' },
      { nombre: 'Festival de Cerveza Artesanal y Maridaje Andino', hora: '19:00 - 22:00', dia: '12 Oct' }
    ],
    institucional: [
      { nombre: 'Punto de Asistencia y Coordinación Sanitaria', hora: 'Permanente', dia: '09-12 Oct' }
    ]
  };

  public readonly POI_LIST: PointOfInterest[] = [
    { id: "POI-ENT-OESTE", label: "Ingreso Lateral Oeste", sub: "Pabellón Cubierto (Oeste)", x: -48.5, y: 4.2, z: 4.5, color: 0xa855f7, desc: "Puerta de acceso lateral oeste conectada a la plaza de artesanos y sector tecnológico." },
    { id: "POI-ENT-SUR1", label: "Acceso Principal 1", sub: "Pabellón Cubierto (Sur)", x: -25.5, y: 4.2, z: 25.5, color: 0xa855f7, desc: "Acceso sur de gran caudal con pórtico climatizado e ingreso directo desde el patio central." },
    { id: "POI-ENT-SUR2", label: "Acceso Principal 2", sub: "Pabellón Cubierto (Sur)", x: 23.5, y: 4.2, z: 25.5, color: 0xa855f7, desc: "Segundo acceso principal sur frente a las parcelas de exposición automotriz y maquinaria pesada." },
    { id: "POI-ENT-ESTE", label: "Acceso Este", sub: "Pabellón Cubierto (Este)", x: 48.5, y: 4.2, z: -3.5, color: 0xa855f7, desc: "Puerta de acceso este para público y proveedores con salida directa hacia el playón exterior." },
    { id: "POI-SAME-NORTE", label: "SAME 107 (Norte)", sub: "Puesto Sanitario de Emergencia", x: -66.0, y: 5.2, z: -24.0, color: 0xef4444, desc: "Base operativa SAME Norte con ambulancia de alta complejidad, enfermería y triage médico." },
    { id: "POI-SAME-SUR", label: "SAME 107 (Sur)", sub: "Puesto Sanitario de Emergencia", x: -62.0, y: 5.2, z: 120.0, color: 0xef4444, desc: "Base operativa SAME Sur contigua al sector gastronómico, shows y avenida principal." },
    { id: "POI-BOLETERIA", label: "Boleterías Oficiales", sub: "Venta & Canje de Entradas", x: -103.0, y: 5.6, z: 57.0, color: 0xf43f5e, desc: "Complejo de ventanillas y boletería informatizada con cobro QR, efectivo y tarjetas." },
    { id: "POI-ESCENARIO", label: "Escenario de Espectáculos", sub: "Shows en Vivo & Festivales", x: -80.0, y: 9.0, z: 95.0, color: 0x00f0ff, desc: "Escenario central techado con sonido line-array y pantalla LED para espectáculos culturales." },
    { id: "POI-PATIO-COMIDAS", label: "Patio de Comidas Central", sub: "Paseo Gastronómico", x: -18.0, y: 4.2, z: 92.0, color: 0xff7b00, desc: "Explanada peatonal con mesas de convivencia, puntos limpios y áreas de descanso al aire libre." },
    { id: "POI-JUEGOS", label: "Juegos Infantiles", sub: "Espacio Recreativo Familiar", x: 45.0, y: 6.0, z: 92.0, color: 0x22c55e, desc: "Sector de entretenimiento para niños, peloteros inflables y actividades recreativas supervisadas." },
    { id: "POI-FOOD-1", label: "Tinglado Food Trucks 1", sub: "Sector Gastronómico Techado", x: -36.89, y: 10.0, z: 119.78, color: 0xff7b00, desc: "Gran nave cubierta con 8 food trucks de comida regional, cervecitas artesanales y puestos de comidas típicas." },
    { id: "POI-FOOD-2", label: "Tinglado Food Trucks 2", sub: "Sector Gastronómico Techado", x: 1.46, y: 10.0, z: 121.36, color: 0xff7b00, desc: "Segunda nave cubierta con amplia oferta de parrilla, empanadas jujeñas y cafetería de especialidad." }
  ];

  // Traslado completo de coordenadas y props exportados de Blender
  public readonly BLENDER_PAYLOAD: BlenderPayload = {
    portico: {
      id: "PORTICO-ENTRADA",
      x: -104.65,
      y: 4.04,
      z: 78.0,
      rotY: 0.0,
      w: 1.8,
      l: 17.0,
      h: 7.2
    },
    props: [
      { id: "PROP-FOOD-01", subtipo: "tinglado_foodtrucks", x: -36.89, y: 5.55, z: 119.78, rotY: 0.0, w: 30.54, l: 21.8, h: 8.89 },
      { id: "PROP-FOOD-02", subtipo: "tinglado_foodtrucks", x: 1.46, y: 5.69, z: 121.36, rotY: 0.0, w: 30.23, l: 21.88, h: 8.89 },
      { id: "PROP-ROTONDA", subtipo: "rotonda_peatonal", x: 66.64, y: 0.0, z: 78.76, rotY: 0.0, w: 20.64, l: 20.64, h: 0.0 }
    ],
    stands: [
      { id: "CUB-B1", name: "Stand B1", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.46, l: 4.2, h: 3.0, x: -9.8, y: 1.16, z: -22.52, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-B2", name: "Stand B2", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.46, l: 4.2, h: 3.0, x: -5.9, y: 1.16, z: -22.52, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-B3", name: "Stand B3", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.46, l: 4.2, h: 3.0, x: -1.99, y: 1.16, z: -22.52, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-B4", name: "Stand B4", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.46, l: 4.2, h: 3.0, x: 1.9, y: 1.16, z: -22.52, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-B5", name: "Stand B5", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.46, l: 4.2, h: 3.0, x: 5.89, y: 1.16, z: -22.52, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-B6", name: "Stand B6", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.46, l: 4.2, h: 3.0, x: 9.79, y: 1.16, z: -22.52, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-B7", name: "Stand B7", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.46, l: 4.2, h: 3.0, x: 13.69, y: 1.16, z: -22.52, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-B8", name: "Stand B8", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.46, l: 4.2, h: 3.0, x: 17.59, y: 1.16, z: -22.52, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-A3", name: "Stand A3", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.8, l: 4.2, h: 3.0, x: -31.6, y: 1.14, z: -22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-A4", name: "Stand A4", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.8, l: 4.2, h: 3.0, x: -27.37, y: 1.14, z: -22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-POL-A1", name: "Stand A1", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 1982639, w: 14.5, l: 12.5, h: 3.8, x: -40.75, y: 1.9, z: -18.75, rotY: 0.0, type: "planta_libre", rubro: "Gran Pabellón Esquina Planta Libre" },
      { id: "CORP-F1", name: "Stand F1", sectorKey: "corporativo", sectorName: "Sector Corporativo", carpetColor: 14251782, w: 16.0, l: 15.0, h: 0.0, x: -94.8, y: -0.12, z: -17.48, rotY: 0.0, type: "corporativo", rubro: "Gran Industria y Minería" },
      { id: "CUB-C58", name: "Stand C58", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.21, l: 2.58, h: 3.0, x: 12.56, y: 1.14, z: -13.2, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C59", name: "Stand C59", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.21, l: 2.58, h: 3.0, x: 16.01, y: 1.14, z: -13.2, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C60", name: "Stand C60", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.21, l: 2.58, h: 3.0, x: 19.41, y: 1.14, z: -13.2, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C61", name: "Stand C61", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.21, l: 2.58, h: 3.0, x: 22.86, y: 1.14, z: -13.2, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C62", name: "Stand C62", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.21, l: 2.58, h: 3.0, x: 26.3, y: 1.14, z: -13.2, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C29", name: "Stand C29", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -2.04, y: 1.15, z: -13.12, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C30", name: "Stand C30", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 1.12, y: 1.15, z: -13.12, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-PL-A5", name: "Stand A5", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 1982639, w: 14.0, l: 18.5, h: 3.8, x: 41.0, y: 1.9, z: -15.75, rotY: 0.0, type: "planta_libre", rubro: "Espacio Institucional Planta Libre" },
      { id: "CUB-C57", name: "Stand C57", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.21, l: 2.58, h: 3.0, x: 12.77, y: 1.16, z: -10.41, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C69", name: "Stand C69", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.21, l: 2.58, h: 3.0, x: 16.21, y: 1.16, z: -10.41, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C68", name: "Stand C68", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.21, l: 2.58, h: 3.0, x: 19.62, y: 1.16, z: -10.41, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C67", name: "Stand C67", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.21, l: 2.58, h: 3.0, x: 23.06, y: 1.16, z: -10.41, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C66", name: "Stand C66", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.21, l: 2.58, h: 3.0, x: 26.5, y: 1.16, z: -10.41, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-D1", name: "Stand D1", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 0x16a34a, w: 2.9, l: 2.9, h: 3.0, x: -18.49, y: 1.14, z: -10.39, rotY: 0.0, type: "cubierto", rubro: "Espacio Institucional PyME" },
      { id: "CUB-C102", name: "Stand C102", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.4, l: 3.2, h: 3.0, x: -46, y: 1.14, z: -10.37, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C33", name: "Stand C33", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.22, x: -2.04, y: 1.15, z: -9.87, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C34", name: "Stand C34", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.22, x: 1.12, y: 1.15, z: -9.87, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C21", name: "Stand C21", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -15.06, y: 1.14, z: -9.48, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C19", name: "Stand C19", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -17.18, y: 1.14, z: -7.37, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C22", name: "Stand C22", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -12.93, y: 1.14, z: -7.37, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C8", name: "Stand C8", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -27.07, y: 1.14, z: -7.07, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C101", name: "Stand C101", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.4, l: 3.2, h: 3.0, x: -46, y: 1.14, z: -6.97, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C32", name: "Stand C32", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -2.04, y: 1.15, z: -6.62, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C31", name: "Stand C31", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 1.12, y: 1.15, z: -6.62, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C10", name: "Stand C10", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -15.06, y: 1.14, z: -5.25, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C23", name: "Stand C23", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -10.81, y: 1.14, z: -5.25, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C7", name: "Stand C7", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -29.19, y: 1.14, z: -4.95, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C9", name: "Stand C9", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -24.93, y: 1.14, z: -4.95, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C100", name: "Stand C100", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.4, l: 3.2, h: 3.0, x: -46, y: 1.14, z: -3.57, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CORP-G1", name: "Stand G1", sectorKey: "corporativo", sectorName: "Sector Corporativo", carpetColor: 14251782, w: 11.12, l: 11.12, h: 0.0, x: -97.14, y: 0.0, z: -3.32, rotY: 0.0, type: "corporativo", rubro: "Gran Industria y Minería" },
      { id: "CUB-C28", name: "Stand C28", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -12.93, y: 1.14, z: -3.12, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C24", name: "Stand C24", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -8.7, y: 1.14, z: -3.1, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C20", name: "Stand C20", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -27.07, y: 1.14, z: -2.82, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-D3", name: "Stand D3", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 0x16a34a, w: 3.91, l: 2.58, h: 3.0, x: 21.44, y: 1.14, z: -2.41, rotY: 0.0, type: "cubierto", rubro: "Espacio Institucional PyME" },
      { id: "CUB-D4", name: "Stand D4", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 0x16a34a, w: 3.91, l: 2.58, h: 3.0, x: 25.65, y: 1.14, z: -2.27, rotY: 0.0, type: "cubierto", rubro: "Espacio Institucional PyME" },
      { id: "CUB-C27", name: "Stand C27", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -10.83, y: 1.14, z: -0.97, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C25", name: "Stand C25", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -6.57, y: 1.14, z: -0.96, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C11", name: "Stand C11", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -19.84, y: 1.14, z: -0.37, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C99", name: "Stand C99", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.4, l: 3.2, h: 3.0, x: -46, y: 1.14, z: -0.17, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C43", name: "Stand C43", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 5.75, y: 1.14, z: -0.15, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C44", name: "Stand C44", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 10.01, y: 1.14, z: -0.14, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-D5", name: "Stand D5", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 0x16a34a, w: 3.91, l: 2.58, h: 3.0, x: 25.85, y: 1.14, z: 0.35, rotY: 0.0, type: "cubierto", rubro: "Espacio Institucional PyME" },
      { id: "CUB-D6", name: "Stand D6", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 0x16a34a, w: 3.91, l: 2.58, h: 3.0, x: 21.64, y: 1.16, z: 0.39, rotY: 0.0, type: "cubierto", rubro: "Espacio Institucional PyME" },
      { id: "CUB-E15", name: "Stand E15", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 45.6, y: 1.19, z: 0.84, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C26", name: "Stand C26", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -8.69, y: 1.14, z: 1.16, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C18", name: "Stand C18", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -21.97, y: 1.14, z: 1.75, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C12", name: "Stand C12", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -17.72, y: 1.14, z: 1.75, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C56", name: "Stand C56", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 7.88, y: 1.14, z: 1.98, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C45", name: "Stand C45", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 12.15, y: 1.14, z: 1.98, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E9", name: "Stand E9", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 32.95, y: 1.19, z: 2.48, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E10", name: "Stand E10", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 35.82, y: 1.19, z: 2.48, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E11", name: "Stand E11", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 38.67, y: 1.19, z: 2.48, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C17", name: "Stand C17", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -19.84, y: 1.14, z: 3.88, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E16", name: "Stand E16", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 45.6, y: 1.19, z: 3.89, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C13", name: "Stand C13", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -15.62, y: 1.14, z: 3.9, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C55", name: "Stand C55", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 10.01, y: 1.14, z: 4.11, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C46", name: "Stand C46", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 14.28, y: 1.14, z: 4.11, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E14", name: "Stand E14", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 32.94, y: 1.19, z: 5.74, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E13", name: "Stand E13", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 35.8, y: 1.19, z: 5.74, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E12", name: "Stand E12", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 38.67, y: 1.19, z: 5.74, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C2", name: "Stand C2", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -29.16, y: 1.14, z: 5.83, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C16", name: "Stand C16", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -17.74, y: 1.14, z: 6.03, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C14", name: "Stand C14", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -13.48, y: 1.14, z: 6.04, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C53", name: "Stand C53", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 12.15, y: 1.14, z: 6.25, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C49", name: "Stand C49", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 16.39, y: 1.14, z: 6.27, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E17", name: "Stand E17", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 45.6, y: 1.19, z: 7.01, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C1", name: "Stand C1", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -31.29, y: 1.14, z: 7.95, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C3", name: "Stand C3", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -27.06, y: 1.14, z: 7.98, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C15", name: "Stand C15", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -15.6, y: 1.14, z: 8.16, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C52", name: "Stand C52", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 14.26, y: 1.14, z: 8.4, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C50", name: "Stand C50", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 18.54, y: 1.14, z: 8.42, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CORP-G2", name: "Stand CORP-G2", sectorKey: "corporativo", sectorName: "Sector Corporativo", carpetColor: 14251782, w: 11.12, l: 11.12, h: 0.0, x: -97.14, y: 0.0, z: 8.94, rotY: 0.0, type: "corporativo", rubro: "Gran Industria y Minería" },
      { id: "CUB-E18", name: "Stand E18", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 45.6, y: 1.19, z: 10.06, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E19", name: "Stand E19", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 45.6, y: 1.19, z: 13.11, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C6", name: "Stand C6", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -29.19, y: 1.14, z: 10.1, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C4", name: "Stand C4", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -24.92, y: 1.14, z: 10.12, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-TRI-A6", name: "Stand CUB-TRI-A6", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 1920728, w: 23.89, l: 10.21, h: 3.8, x: -0.07, y: 1.9, z: 10.15, rotY: 0.0, type: "triangular", rubro: "Stand Corporativo Central Planta Libre" },
      { id: "CUB-C51", name: "Stand CUB-C51", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: 16.4, y: 1.14, z: 10.55, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E2", name: "Stand E2", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 30.05, y: 1.19, z: 12.05, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E3", name: "Stand E3", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 32.9, y: 1.19, z: 12.05, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E4", name: "Stand E4", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 35.82, y: 1.19, z: 12.05, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E5", name: "Stand E5", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 38.67, y: 1.19, z: 12.05, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C5", name: "Stand C5", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.9, l: 2.9, h: 3.0, x: -27.05, y: 1.14, z: 12.24, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C98", name: "Stand C98", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.4, l: 3.2, h: 3.0, x: -46, y: 1.14, z: 12.49, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "EXT-P-06", name: "Stand EXT06", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -69.19, y: 1.22, z: 13.49, rotY: -1.5708, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "EXT-P-03", name: "Stand EXT03", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -64.39, y: 1.22, z: 13.5, rotY: 1.5708, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "CUB-E1", name: "Stand E1", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 30.05, y: 1.19, z: 15.3, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E8", name: "Stand E8", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 32.94, y: 1.19, z: 15.3, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E7", name: "Stand E7", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 35.8, y: 1.19, z: 15.3, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E6", name: "Stand E6", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 38.67, y: 1.19, z: 15.3, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C97", name: "Stand C97", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.4, l: 3.2, h: 3.0, x: -46, y: 1.14, z: 15.89, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E20", name: "Stand E20", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 45.6, y: 1.19, z: 16.15, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "EXT-P-04", name: "Stand EXT04", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -69.19, y: 1.22, z: 18.86, rotY: -1.5708, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "EXT-P-05", name: "Stand EXT05", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -64.38, y: 1.22, z: 18.86, rotY: 1.5708, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "CUB-E21", name: "Stand E21", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 2.7, l: 2.7, h: 3.0, x: 45.6, y: 1.19, z: 19.27, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C96", name: "Stand C96", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.4, l: 3.2, h: 3.0, x: -46, y: 1.14, z: 19.29, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CORP-G3", name: "Stand CORP-G3", sectorKey: "corporativo", sectorName: "Sector Corporativo", carpetColor: 14251782, w: 11.12, l: 11.12, h: 0.0, x: -97.14, y: 0.0, z: 21.8, rotY: 0.0, type: "corporativo", rubro: "Gran Industria y Minería" },
      { id: "CUB-C94", name: "Stand C94", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: -34.83, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C93", name: "Stand C93", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: -31.43, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C91", name: "Stand C91", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: -19.32, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C90", name: "Stand C90", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: -15.92, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C92", name: "Stand C92", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: -12.52, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C89", name: "Stand C89", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: -3.23, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C88", name: "Stand C88", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: 0.17, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C87", name: "Stand C87", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: 11.85, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C86", name: "Stand C86", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: 15.25, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C85", name: "Stand C85", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: 18.64, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C84", name: "Stand C84", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: 27.84, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C83", name: "Stand C83", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: 31.25, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C82", name: "Stand C82", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: 34.64, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C81", name: "Stand C81", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.2, l: 3.4, h: 3.0, x: 38.1, y: 1.14, z: 22.5, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-E22", name: "Stand E22", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 7.11, l: 3.38, h: 3.0, x: 43.25, y: 1.14, z: 22.51, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "CUB-C95", name: "Stand C95", sectorKey: "cubierto", sectorName: "Pabellón Cubierto", carpetColor: 15357964, w: 3.4, l: 3.2, h: 3.0, x: -46, y: 1.14, z: 22.69, rotY: 0.0, type: "cubierto", rubro: "Industria, Comercio y Servicios" },
      { id: "EXT-P-07", name: "Stand EXT07", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -69.14, y: 1.22, z: 24.17, rotY: -1.5708, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "EXT-P-02", name: "Stand EXT02", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -64.35, y: 1.22, z: 24.17, rotY: 1.5708, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "MAQ-13", name: "Stand MAQ-13", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 18.12, l: 7.12, h: 3.0, x: 43.49, y: 0.73, z: 37.53, rotY: 0.1788, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      { id: "EXT-P-11", name: "Stand EXT11", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -39.16, y: 1.22, z: 38.31, rotY: -0.4627, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "MAQ-01", name: "Stand MAQ-01", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 18.12, l: 7.12, h: 3.0, x: 7.54, y: 0.73, z: 39.69, rotY: 0.1439, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      { id: "EXT-P-08", name: "Stand EXT08", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -61.27, y: 1.22, z: 39.71, rotY: -2.9666, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "EXT-P-09", name: "Stand EXT09", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -66.56, y: 1.22, z: 40.66, rotY: -2.9666, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "EXT-P-18", name: "Stand EXT18", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -34.33, y: 1.22, z: 40.71, rotY: -0.4627, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "EXT-P-10", name: "Stand EXT10", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -71.78, y: 1.22, z: 41.59, rotY: -2.9666, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "MAQ-03", name: "Stand MAQ-03", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 18.12, l: 7.12, h: 3.0, x: -10.66, y: 0.73, z: 42.36, rotY: 0.1479, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      // CORP-G4 con z: 35.0 según regla técnica para despejar el acceso
      { id: "CORP-G4", name: "Stand CORP-G4", sectorKey: "corporativo", sectorName: "Sector Corporativo", carpetColor: 14251782, w: 17.5, l: 5.7, h: 0.0, x: -102.5, y: 0.0, z: 35.0, rotY: 0.42, type: "corporativo", rubro: "Gran Industria y Minería", area: "100.0 m²" },
      { id: "EXT-P-17", name: "Stand EXT17", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -57.94, y: 1.22, z: 44.72, rotY: 0.1663, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "EXT-P-16", name: "Stand EXT16", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -64.25, y: 1.22, z: 45.89, rotY: 0.1663, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "EXT-P-15", name: "Stand EXT15", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -70.82, y: 1.22, z: 46.93, rotY: 0.1663, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "MAQ-10", name: "Stand MAQ-10", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 18.12, l: 7.12, h: 3.0, x: 40.38, y: 0.73, z: 55.94, rotY: 0.1788, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      { id: "MAQ-11", name: "Stand MAQ-11", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 18.12, l: 7.12, h: 3.0, x: 14.43, y: 0.74, z: 57.39, rotY: 0.1653, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      { id: "EXT-P-14", name: "Stand EXT14", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -38.02, y: 1.22, z: 60.89, rotY: 0.1682, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "MAQ-04", name: "Stand MAQ-04", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 18.12, l: 7.12, h: 3.0, x: -10.29, y: 0.73, z: 61.57, rotY: 0.1678, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      { id: "EXT-P-13", name: "Stand EXT13", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -43.31, y: 1.22, z: 61.79, rotY: 0.1682, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "EXT-P-12", name: "Stand EXT12", sectorKey: "artesano", sectorName: "Sector Artesanos y PyMEs", carpetColor: 11817737, w: 4.8, l: 4.0, h: 3.0, x: -48.61, y: 1.22, z: 62.7, rotY: 0.1682, type: "artesano", rubro: "Artesanías y Emprendimientos" },
      { id: "MAQ-02", name: "Stand MAQ-02", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 14.12, l: 6.62, h: 3.0, x: -67.05, y: 0.74, z: 78.95, rotY: 0.0, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      { id: "MAQ-12", name: "Stand MAQ-12", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 14.12, l: 6.62, h: 3.0, x: 36.31, y: 0.74, z: 78.95, rotY: 0.0, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      { id: "MAQ-05", name: "Stand MAQ-05", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 13.12, l: 6.62, h: 3.0, x: 20.43, y: 0.73, z: 78.96, rotY: 0.0, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      { id: "MAQ-07", name: "Stand MAQ-07", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 14.12, l: 6.62, h: 3.0, x: -33.39, y: 0.73, z: 78.97, rotY: 0.0, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      { id: "MAQ-06", name: "Stand MAQ-06", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 14.12, l: 6.62, h: 3.0, x: -50.17, y: 0.74, z: 78.98, rotY: 0.0, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      { id: "MAQ-09", name: "Stand MAQ-09", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 13.12, l: 6.62, h: 3.0, x: -10.64, y: 0.73, z: 79.03, rotY: 0.0, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" },
      { id: "MAQ-08", name: "Stand MAQ-08", sectorKey: "descubierto", sectorName: "Maquinaria y Gran Escala", carpetColor: 988970, w: 13.12, l: 6.62, h: 3.0, x: 4.87, y: 0.74, z: 79.05, rotY: 0.0, type: "descubierto", rubro: "Maquinaria Pesada y Automotores" }
    ]
  };

  public getStandsProcessed(): StandData[] {
    if (this.standsCache) {
      return this.standsCache;
    }

    // La GEOMETRÍA (posición, tamaño, rotación) es fija: proviene del export de
    // Blender y no existe en la base. Lo que sí viene de PostgreSQL es la
    // asignación de expositor, y se aplica después sobre estos mismos objetos.
    this.standsCache = this.BLENDER_PAYLOAD.stands.map(item => {
      let rotY = item.rotY || 0;
      let w = item.w;
      let l = item.l;

      const diagNE = ["CUB-C8", "CUB-C9", "CUB-C21", "CUB-C22", "CUB-C23", "CUB-C24", "CUB-C25", "CUB-11", "CUB-C12", "CUB-C13", "CUB-C14", "CUB-C2", "CUB-C3", "CUB-C4"];
      const diagSW = ["CUB-C7", "CUB-C20", "CUB-C19", "CUB-C10", "CUB-C28", "CUB-C27", "CUB-C26", "CUB-C18", "CUB-C17", "CUB-C16", "CUB-C15", "CUB-C1", "CUB-C6", "CUB-C5"];
      const diagNW = ["CUB-C43", "CUB-C56", "CUB-C55", "CUB-C53", "CUB-C52", "CUB-C51"];
      const diagSE = ["CUB-C44", "CUB-C45", "CUB-C46", "CUB-C49", "CUB-C50"];

      if (diagNE.includes(item.id)) { rotY = (3 * Math.PI) / 4; w = 2.9; l = 2.9; }
      else if (diagSW.includes(item.id)) { rotY = -Math.PI / 4; w = 2.9; l = 2.9; }
      else if (diagNW.includes(item.id)) { rotY = -(3 * Math.PI) / 4; w = 2.9; l = 2.9; }
      else if (diagSE.includes(item.id)) { rotY = Math.PI / 4; w = 2.9; l = 2.9; }
      else if (item.id === "CUB-D1") { rotY = -(3 * Math.PI) / 4; w = 2.9; l = 2.9; }
      else if (item.id === "CUB-D3" || item.id === "CUB-D4") { rotY = Math.PI; }
      else if (item.id === "CUB-D5" || item.id === "CUB-D6") { rotY = 0; }
      else if (item.id.startsWith("CUB-") && item.z > 20) { rotY = Math.PI; }
      else if (item.id.startsWith("CUB-") && item.x < -40 && item.z > -12 && item.z < 25) { rotY = Math.PI / 2; }
      else if (item.id.startsWith("CUB-") && item.x > 40 && item.z > -2 && item.z < 25) { rotY = -Math.PI / 2; }
      else if (item.id.startsWith("CUB-B") || item.id === "CUB-A3" || item.id === "CUB-A4") { rotY = 0; }
      else if (["CUB-C58", "CUB-C59", "CUB-C60", "CUB-C61", "CUB-C62", "CUB-E9", "CUB-E10", "CUB-E11", "CUB-E2", "CUB-E3", "CUB-E4", "CUB-E5"].includes(item.id)) { rotY = Math.PI; }
      else if (["CUB-C57", "CUB-C69", "CUB-C68", "CUB-C67", "CUB-C66", "CUB-E14", "CUB-E13", "CUB-E12", "CUB-E1", "CUB-E8", "CUB-E7", "CUB-E6"].includes(item.id)) { rotY = 0; }
      else if (["CUB-C29", "CUB-C33", "CUB-C32"].includes(item.id)) { rotY = -Math.PI / 2; }
      else if (["CUB-C30", "CUB-C34", "CUB-C31"].includes(item.id)) { rotY = Math.PI / 2; }

      return {
        ...item,
        w,
        l,
        rotY,
        status: item.status || 'disponible' as CommercialStatus,
        area: item.area || `${(w * l).toFixed(1)} m²`
      };
    });

    // Si los expositores llegaron antes del primer render, se aplican de inmediato.
    if (this.expositores().length > 0) {
      this.aplicarExpositoresAStands(this.expositores());
    }

    return this.standsCache;
  }

  /**
   * Carga paginada de `/api/expositores` y sincroniza los stands con la BD.
   * Si la API falla, el visor sigue funcionando con la geometría y sin
   * empresas asignadas: no se inventan datos.
   */
  public cargarExpositores(): void {
    if (this.isLoadingExpositores()) return;

    this.isLoadingExpositores.set(true);

    this.fetchTodasLasPaginas(200)
      .pipe(
        catchError(() => {
          console.warn('[Masterplan] No se pudieron cargar los expositores; el visor sigue con la geometría estática.');
          return EMPTY;
        })
      )
      .subscribe((items) => {
        this.isLoadingExpositores.set(false);
        if (items.length === 0) return;

        this.expositores.set(items);
        this.aplicarExpositoresAStands(items);
      });
  }

  /** Recorre todas las páginas del endpoint paginado y concatena los items. */
  private fetchTodasLasPaginas(pageSize: number): Observable<ExpositorRecord[]> {
    return this.expositorApi.getExpositores({ page: 1, pageSize }).pipe(
      expand((res: PaginatedResponse<Expositor>) => {
        const data = res.data;
        if (!data?.hasMore) return EMPTY;
        return this.expositorApi.getExpositores({ page: (data.page ?? 1) + 1, pageSize });
      }),
      reduce(
        (acc: ExpositorRecord[], res: PaginatedResponse<Expositor>) => acc.concat(res.data?.items ?? []),
        [] as ExpositorRecord[]
      )
    );
  }

  /**
   * Cruza cada expositor con su stand usando el campo `stand` de la BD
   * (ej. "Stand A-12 · Pab. Minería") contra el id/nombre del stand 3D
   * (ej. "CUB-A12" / "Stand A12"). La asignación es determinista: sin
   * `Math.random()`, la misma BD siempre produce el mismo mapa.
   */
  private aplicarExpositoresAStands(items: ExpositorRecord[]): void {
    const stands = this.getStandsProcessedSinRecursion();

    const porCodigo = new Map<string, ExpositorRecord>();
    for (const item of items) {
      const codigo = this.normalizarCodigo(item.stand);
      if (codigo && !porCodigo.has(codigo)) {
        porCodigo.set(codigo, item);
      }
    }

    let asignados = 0;

    for (const stand of stands) {
      const expositor = this.buscarExpositorParaStand(stand, porCodigo);

      if (!expositor) {
        // Sin expositor en la BD: el stand queda disponible, sin empresa inventada.
        stand.company = undefined;
        stand.status = 'disponible';
        continue;
      }

      asignados++;
      stand.company = expositor.name;
      stand.status = 'ocupado';
      stand.desc = [expositor.subtitle, expositor.origin && `Origen: ${expositor.origin}`]
        .filter(Boolean)
        .join(' · ') || expositor.description || undefined;
    }

    this.dataVersion.update((v) => v + 1);

    if (asignados > 0) {
      console.info(`[Masterplan] ${asignados} stands sincronizados con /api/expositores.`);
    }
  }

  /** Variante de `getStandsProcessed` que no re-dispara la sincronización. */
  private getStandsProcessedSinRecursion(): StandData[] {
    const cache = this.standsCache;
    if (cache) return cache;
    return this.getStandsProcessed();
  }

  private buscarExpositorParaStand(
    stand: StandData,
    porCodigo: Map<string, ExpositorRecord>
  ): ExpositorRecord | undefined {
    for (const candidato of this.codigosCandidatosDelStand(stand)) {
      const expositor = porCodigo.get(candidato);
      if (expositor) return expositor;
    }
    return undefined;
  }

  /**
   * Códigos con los que un stand puede aparecer en la BD.
   * "CUB-B1" → ['B1'] · "EXT-P-06" → ['P06','EXT06'] · "CORP-G2" → ['G2','CORPG2']
   */
  private codigosCandidatosDelStand(stand: StandData): string[] {
    const candidatos: string[] = [];

    const desdeId = this.normalizarCodigo(stand.id.split('-').slice(1).join('-'));
    if (desdeId) candidatos.push(desdeId);

    const desdeNombre = this.normalizarCodigo(stand.name.replace(/^stand\s*/i, ''));
    if (desdeNombre) candidatos.push(desdeNombre);

    return [...new Set(candidatos)];
  }

  /**
   * Reduce un rótulo de stand a un código comparable: sin separadores, sin
   * ceros a la izquierda y en mayúsculas.
   * "Stand A-12 · Pab. Minería" → "A12" · "B-03" → "B3" · "E-04" → "E4"
   */
  private normalizarCodigo(rotulo: string | null | undefined): string {
    if (!rotulo) return '';

    // Se corta en el separador de pabellón ("·") para quedar sólo con el código.
    const codigo = rotulo.split('·')[0];

    return codigo
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/^STAND/, '')
      .replace(/0+(\d)/g, '$1');
  }

  public selectStand(stand: StandData | null): void {
    this.selectedStand.set(stand);
  }

  public setFilter(filter: string): void {
    this.activeFilter.set(filter);
  }

  public setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }
}
