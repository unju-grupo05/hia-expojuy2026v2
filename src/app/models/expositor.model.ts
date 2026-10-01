/**
 * Contrato de `Expositor` (`/api/expositores`).
 *
 * Consolida el que antes vivia suelto en `components/models/exhibitor.model.ts`.
 * `category` es texto libre en la base (columna `STRING` sin constraint), asi
 * que se tipa como `string`; las pestanas de filtro de la seccion publica
 * comparan contra literales, no contra el tipo.
 */
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
}
