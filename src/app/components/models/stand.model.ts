export type StandType = 'cubierto' | 'triangular' | 'planta_libre' | 'corporativo' | 'descubierto' | 'artesano';
export type CommercialStatus = 'disponible' | 'reservado' | 'cedido';
export type SectorKey = 'cubierto' | 'corporativo' | 'descubierto' | 'artesano' | 'gastronomico' | 'all';

export interface StandExpositor {
  id: string;
  name: string;
  stand?: string;
  category?: string;
  subtitle?: string;
  description?: string;
  origin?: string;
  email?: string | null;
  logo?: string;
}

export interface UbicacionStandDto {
  id?: number;
  standId?: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  w: number;
  l: number;
  h?: number;
  carpetColor?: number;
  type?: StandType | string;
}

export interface StandBackendDto {
  id: string;
  sector?: string;
  superficie?: string;
  estado: CommercialStatus | string;
  notas?: string | null;
  expositorId?: string | null;
  expositor?: StandExpositor | null;
  ubicacion?: UbicacionStandDto | null;
  // Campos opcionales planos para retrocompatibilidad
  x?: number;
  y?: number;
  z?: number;
  rotY?: number;
  w?: number;
  l?: number;
  h?: number;
  carpetColor?: number;
  type?: StandType | string;
}

export interface StandApiResponse {
  success: boolean;
  data: StandBackendDto[];
  message?: string;
}

export interface StandData {
  id: string;
  name: string;
  sectorKey: SectorKey;
  sectorName: string;
  carpetColor: number;
  w: number;
  l: number;
  h?: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  type: StandType;
  rubro: string;
  area?: string;
  superficie?: string;
  status?: CommercialStatus;
  company?: string;
  desc?: string;
  isPOI?: boolean;
  expositor?: StandExpositor | null;
}

export interface PropItem {
  id: string;
  subtipo: 'tinglado_foodtrucks' | 'rotonda_peatonal' | 'tabique_pasillo' | 'decorado_general';
  x: number;
  y: number;
  z: number;
  rotY: number;
  w: number;
  l: number;
  h: number;
}

export interface PorticoItem {
  id: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  w: number;
  l: number;
  h: number;
}

export interface BlenderPayload {
  portico: PorticoItem;
  props: PropItem[];
  stands: StandData[];
}

export interface PointOfInterest {
  id: string;
  label: string;
  sub: string;
  x: number;
  y: number;
  z: number;
  color: number;
  desc: string;
}
