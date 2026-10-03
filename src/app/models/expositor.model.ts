export interface ExpositorStandSummary {
  id: string;
  sector: string;
  superficie?: string;
  estado: string;
}

export interface Expositor {
  id: string;
  name: string;
  stand: string | null;
  category: string;
  subtitle: string | null;
  description: string | null;
  origin: string | null;
  email: string | null;
  logo?: string | null;
  stands?: ExpositorStandSummary[];
  createdAt?: string;
  updatedAt?: string;
}

/** Filtros opcionales de `GET /api/expositores`. */
export interface ExpositorQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
}

/** Cuerpo de `POST` / `PUT` de un expositor. */
export interface ExpositorPayload {
  id?: string;
  name: string;
  stand?: string | null;
  standIds?: string[];
  category: string;
  subtitle?: string | null;
  description?: string | null;
  origin?: string | null;
  email?: string | null;
  logo?: string | null;
}

export interface ExpositorLogoResponse {
  success: boolean;
  data: (Partial<Expositor> & {
    url?: string | null;
    filename?: string;
    size?: number;
    width?: number;
    height?: number;
    format?: string;
  }) | null;
  message?: string;
}
