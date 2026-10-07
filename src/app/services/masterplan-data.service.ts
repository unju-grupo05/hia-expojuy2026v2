import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError, expand, map, reduce } from 'rxjs/operators';
import { API_URL } from '../core/api-url';
import {
  BlenderPayload,
  CommercialStatus,
  PointOfInterest,
  SectorKey,
  StandApiResponse,
  StandBackendDto,
  StandData,
  StandType
} from '../components/models/stand.model';
import { SectorActivity } from '../components/models/sector-info.model';
import { ExpositoresService } from './expositores.service';
import { Expositor } from '../models/expositor.model';
import { PaginatedResponse } from '../models/api-response.model';

export type ExpositorRecord = Expositor;

@Injectable({
  providedIn: 'root'
})
export class MasterplanDataService {
  private readonly http = inject(HttpClient);
  private readonly expositoresService = inject(ExpositoresService);

  // Estado Reactivo con Angular Signals
  public readonly selectedStand = signal<StandData | null>(null);
  public readonly activeFilter = signal<string>('all');
  public readonly searchQuery = signal<string>('');
  public readonly filterStatus = signal<CommercialStatus | 'all'>('all');

  /** Catalogo reactivo de stands oficiales del backend */
  public readonly stands = signal<StandData[]>([]);
  public readonly isLoadingStands = signal<boolean>(true);
  public readonly standsError = signal<string | null>(null);

  /** Expositores reales de PostgreSQL, cargados desde /api/expositores */
  public readonly expositores = signal<ExpositorRecord[]>([]);
  public readonly isLoadingExpositores = signal<boolean>(false);

  /** Version reactiva que notifica cambios a la UI */
  public readonly dataVersion = signal(0);

  /** Cache en memoria para acceso sincronico de Three.js */
  private standsCache: StandData[] | null = null;

  constructor() {
    this.cargarStands();
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
    { id: "POI-SAME-SUR", label: "SAME 107 (Sur)", sub: "Puesto Sanitario de Emergencia", x: -72.0, y: 5.2, z: 120.0, color: 0xef4444, desc: "Base operativa SAME Sur contigua al sector gastronómico, shows y avenida principal." },
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
    stands: []
  };

  /**
   * Carga asincrona de stands oficiales desde la API REST: GET /api/stands.
   * Desempaqueta el envelope { success: true, data: StandBackendDto[], message: string }
   * usando .pipe(map(res => res.data)) y actualiza los Signals reactivos.
   */
  public cargarStands(): void {
    this.isLoadingStands.set(true);
    this.standsError.set(null);

    this.http.get<StandApiResponse>(`${API_URL}/stands`)
      .pipe(
        map((res: StandApiResponse) => res.data || []),
        catchError(err => {
          console.warn('[MasterplanDataService] Backend no disponible, usando fallback local de stands:', err);
          this.standsError.set(err.message || 'Error al conectar con la API de stands');
          return of(this.getFallbackStands());
        })
      )
      .subscribe((standsDtos: (StandBackendDto | StandData)[]) => {
        const standsProcesados = standsDtos.map(dto => this.adaptBackendDtoToStand(dto));
        this.standsCache = standsProcesados;
        this.stands.set(standsProcesados);
        this.isLoadingStands.set(false);
        this.dataVersion.update(v => v + 1);

        // Si ya hay un stand seleccionado, refrescar sus atributos con los datos nuevos
        const current = this.selectedStand();
        if (current) {
          const updated = standsProcesados.find(s => s.id === current.id);
          if (updated) {
            this.selectedStand.set(updated);
          }
        }
      });
  }

  /**
   * Adapter: Transforma el DTO oficial del backend en la interfaz StandData de Three.js / UI:
   * - Mapea dto.estado a stand.status ('disponible' | 'reservado' | 'cedido')
   * - Mapea dto.superficie a stand.area y stand.superficie
   * - Asigna stand.company = dto.expositor.name y stand.desc = dto.expositor.description
   * - Preserva coordenadas espaciales, dimensiones y color institucional (#8b5cf6 para cedidos)
   */
  /**
 * Normaliza la orientación geométrica (rotY) y dimensiones (w, l) para los stands
 * del pabellón cubierto (especialmente pasillos diagonales C y perimetrales),
 * evitando colisiones y solapamientos, y orientándolos correctamente hacia sus pasillos.
 */
  public normalizeStandGeometry(dto: { id: string; x?: number; z?: number; rotY?: number; w?: number; l?: number }): { rotY: number; w: number; l: number } {
    let rotY = dto.rotY || 0;
    let w = dto.w || 3.0;
    let l = dto.l || 3.0;
    const x = dto.x ?? 0;
    const z = dto.z ?? 0;

    // Solo normalizar stands del Pabellón Cubierto; los exteriores (maquinaria, artesanos, corporativos) respetan su rotación original
    const rawId = (dto.id || '').toUpperCase();
    if (rawId.startsWith('MAQ-') || rawId.startsWith('EXT-P-') || rawId.startsWith('CORP-') ||
        rawId.startsWith('H') || rawId.startsWith('G') || rawId.startsWith('F') || rawId.startsWith('I') || rawId.startsWith('K')) {
      return { rotY, w, l };
    }

    const cleanId = rawId.replace(/^(STAND\s*|CUB-POL-|CUB-PL-|CUB-TRI-|CORP-|EXT-P-|MAQ-|CUB-)/gi, '');

    const diagNE = ['C8', 'C9', 'C21', 'C22', 'C23', 'C24', 'C25', 'C11', 'C12', 'C13', 'C14', 'C2', 'C3', 'C4'];
    const diagSW = ['C7', 'C20', 'C19', 'C10', 'C28', 'C27', 'C26', 'C18', 'C17', 'C16', 'C15', 'C1', 'C6', 'C5'];
    const diagNW = ['C43', 'C56', 'C55', 'C53', 'C52', 'C51'];
    const diagSE = ['C44', 'C45', 'C46', 'C49', 'C50'];

    if (diagNE.includes(cleanId)) {
      rotY = (3 * Math.PI) / 4;
      w = 2.9;
      l = 2.9;
    } else if (diagSW.includes(cleanId)) {
      rotY = -Math.PI / 4;
      w = 2.9;
      l = 2.9;
    } else if (diagNW.includes(cleanId)) {
      rotY = -(3 * Math.PI) / 4;
      w = 2.9;
      l = 2.9;
    } else if (diagSE.includes(cleanId)) {
      rotY = Math.PI / 4;
      w = 2.9;
      l = 2.9;
    } else if (cleanId === 'D1') {
      rotY = -(3 * Math.PI) / 4;
      w = 2.9;
      l = 2.9;
    } else if (cleanId === 'D3' || cleanId === 'D4') {
      rotY = Math.PI;
    } else if (cleanId === 'D5' || cleanId === 'D6') {
      rotY = 0;
    } else if (['C58', 'C59', 'C60', 'C61', 'C62', 'E9', 'E10', 'E11', 'E2', 'E3', 'E4', 'E5'].includes(cleanId)) {
      rotY = Math.PI;
    } else if (['C57', 'C69', 'C68', 'C67', 'C66', 'E14', 'E13', 'E12', 'E1', 'E8', 'E7', 'E6'].includes(cleanId)) {
      rotY = 0;
    } else if (['C29', 'C33', 'C32'].includes(cleanId)) {
      rotY = -Math.PI / 2;
    } else if (['C30', 'C34', 'C31'].includes(cleanId)) {
      rotY = Math.PI / 2;
    } else if (cleanId.startsWith('B') || cleanId === 'A3' || cleanId === 'A4') {
      rotY = 0;
    } else if (z > 20 && Math.abs(x) < 45) {
      rotY = Math.PI;
    } else if (x < -40 && z > -12 && z < 25) {
      rotY = Math.PI / 2;
    } else if (x > 40 && z > -2 && z < 25) {
      rotY = -Math.PI / 2;
    }

    return { rotY, w, l };
  }

  public adaptBackendDtoToStand(dto: StandBackendDto | StandData): StandData {
    // 1. Estado comercial normalizado
    let status: CommercialStatus = 'disponible';
    const rawEstado = ('estado' in dto ? dto.estado : dto.status) || 'disponible';
    const estadoStr = String(rawEstado).toLowerCase().trim();
    if (estadoStr === 'cedido') {
      status = 'cedido';
    } else if (estadoStr === 'reservado' || estadoStr === 'ocupado' || estadoStr === 'vendido') {
      status = 'reservado';
    } else {
      status = 'disponible';
    }

    // 2. Extraer geometría espacial (desde objeto anidado ubicacion o dto directo)
    const u = ((dto as any).ubicacion || {}) as any;
    const x = Number(u.x ?? (dto as any).x ?? 0);
    const y = Number(u.y ?? (dto as any).y ?? 0);
    const z = Number(u.z ?? (dto as any).z ?? 0);
    const rotY = Number(u.rotY ?? u.rot_y ?? (dto as any).rotY ?? 0);
    const w = Number(u.w ?? (dto as any).w ?? 3);
    const l = Number(u.l ?? (dto as any).l ?? 3);
    const h = Number(u.h ?? (dto as any).h ?? 2.5);
    let carpetColor = Number(u.carpetColor ?? u.carpet_color ?? (dto as any).carpetColor ?? 15357964);
    const standType: StandType = ((u.type ?? (dto as any).type ?? 'cubierto') as StandType) || 'cubierto';

    // 3. Superficie y Area
    const superficie = ('superficie' in dto && dto.superficie)
      ? String(dto.superficie)
      : (('area' in dto && dto.area) ? String(dto.area) : `${(w * l).toFixed(1)} m²`);
    const area = superficie;

    // 4. Sector y Rubro
    const rawSector = ('sector' in dto && dto.sector)
      ? String(dto.sector)
      : (('sectorName' in dto && dto.sectorName) ? String(dto.sectorName) : 'Pabellón Cubierto');
    const sectorKey: SectorKey = ('sectorKey' in dto && dto.sectorKey)
      ? (dto.sectorKey as SectorKey)
      : this.deriveSectorKey(rawSector, standType, dto.id);
    const sectorName = rawSector;
    const rubro = ('rubro' in dto && dto.rubro)
      ? String(dto.rubro)
      : this.deriveRubro(sectorKey);

    // 5. Expositor y Datos comerciales
    let company: string | undefined = undefined;
    let desc: string | undefined = undefined;
    let expositor: StandBackendDto['expositor'] = null;

    if ('expositor' in dto && dto.expositor) {
      expositor = dto.expositor;
      company = dto.expositor.name;
      desc = dto.expositor.description || dto.expositor.subtitle || undefined;
    } else if ('company' in dto && dto.company) {
      company = dto.company;
      desc = ('desc' in dto) ? dto.desc : undefined;
    }

    if (status === 'disponible') {
      company = undefined;
      desc = undefined;
      expositor = null;
    }

    // 6. Color de alfombra (Violeta institucional 0x8b5cf6 para stands cedidos, Ámbar para reservados)
    if (status === 'cedido') {
      carpetColor = 0x8b5cf6;
    } else if (status === 'reservado' && (!carpetColor || carpetColor === 0x334155 || carpetColor === 15357964)) {
      carpetColor = 0xf59e0b;
    }

    const type = standType;
    const name = ('name' in dto && dto.name)
      ? dto.name
      : (dto.id.startsWith('Stand') ? dto.id : `Stand ${dto.id}`);

    return {
      id: dto.id,
      name,
      sectorKey,
      sectorName,
      carpetColor,
      w,
      l,
      h,
      x,
      y,
      z,
      rotY,
      type,
      rubro,
      area,
      superficie,
      status,
      company,
      desc,
      expositor
    };
  }

  private deriveSectorKey(sector?: string, type?: string, id?: string): SectorKey {
    const s = (sector || '').toLowerCase();
    const t = (type || '').toLowerCase();
    const i = (id || '').toLowerCase();

    if (s.includes('corporativo') || t.includes('corporativo') || i.startsWith('corp') || i.startsWith('g1') || i.startsWith('g2') || i.startsWith('g3') || i.startsWith('g4')) return 'corporativo';
    if (s.includes('artesano') || t.includes('artesano') || i.startsWith('ext-p')) return 'artesano';
    if (s.includes('maquinaria') || s.includes('descubierto') || t.includes('descubierto') || i.startsWith('maq')) return 'descubierto';
    if (s.includes('gastronom') || t.includes('gastronom') || i.startsWith('k')) return 'gastronomico';
    return 'cubierto';
  }

  private deriveRubro(sectorKey: SectorKey): string {
    switch (sectorKey) {
      case 'corporativo': return 'Gran Industria y Mineria';
      case 'artesano': return 'Artesanias y Emprendimientos';
      case 'descubierto': return 'Maquinaria Pesada y Automotores';
      case 'gastronomico': return 'Sector Gastronomico';
      default: return 'Industria, Comercio y Servicios';
    }
  }

  /**
   * Catalogo procesado sincrono. Retorna stands reactivos si ya cargaron,
   * la cache en memoria o el fallback local de Blender.
   */
  public getStandsProcessed(): StandData[] {
    const current = this.stands();
    if (current && current.length > 0) {
      return current;
    }
    if (this.standsCache && this.standsCache.length > 0) {
      return this.standsCache;
    }
    return this.getFallbackStands();
  }

  /**
   * Fallback de stands locales estaticos para desarrollo offline.
   */
  private getFallbackStands(): StandData[] {
    return [];
  }

  /**
   * Carga paginada de /api/expositores para expositores destacados en el Sidebar.
   */
  public cargarExpositores(): void {
    if (this.isLoadingExpositores()) return;

    this.isLoadingExpositores.set(true);

    this.fetchTodasLasPaginas(200)
      .pipe(
        catchError(() => {
          console.warn('[Masterplan] No se pudieron cargar los expositores.');
          return EMPTY;
        })
      )
      .subscribe((items) => {
        this.isLoadingExpositores.set(false);
        if (items.length === 0) return;
        this.expositores.set(items);
      });
  }

  private fetchTodasLasPaginas(pageSize: number): Observable<ExpositorRecord[]> {
    return this.expositoresService.getExpositores({ page: 1, pageSize }).pipe(
      expand((res: PaginatedResponse<Expositor>) => {
        const data = res.data;
        if (!data?.hasMore) return EMPTY;
        return this.expositoresService.getExpositores({ page: (data.page ?? 1) + 1, pageSize });
      }),
      reduce(
        (acc: ExpositorRecord[], res: PaginatedResponse<Expositor>) => acc.concat(res.data?.items ?? []),
        [] as ExpositorRecord[]
      )
    );
  }

  public selectStand(stand: StandData | null): void {
    this.selectedStand.set(stand);
  }

  public setFilter(filter: string): void {
    this.activeFilter.set(filter);
  }

  public setStatusFilter(status: CommercialStatus | 'all'): void {
    this.filterStatus.set(status);
  }

  public setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }
}
