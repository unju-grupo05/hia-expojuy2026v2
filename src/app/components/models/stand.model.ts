export type StandType = 'cubierto' | 'triangular' | 'planta_libre' | 'corporativo' | 'descubierto' | 'artesano';
export type CommercialStatus = 'disponible' | 'reservado' | 'ocupado';
export type SectorKey = 'cubierto' | 'corporativo' | 'descubierto' | 'artesano' | 'gastronomico' | 'all';

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
  status?: CommercialStatus;
  company?: string;
  desc?: string;
  isPOI?: boolean;
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
