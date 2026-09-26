/** Contrato de `Galeria` (`/api/galerias`). */
export interface GaleriaItem {
  id: number;
  titulo: string;
  descripcion: string | null;
  /** Nombre del archivo; la URL absoluta la arma `MediaService`. */
  imagen: string;
  seccion: string | null;
  orden: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Cuerpo de `POST` / `PUT` de un item de galeria. */
export interface GaleriaPayload {
  titulo: string;
  descripcion?: string | null;
  imagen: string;
  seccion?: string | null;
  orden?: number;
}
