/** Contrato de `Eje` (`/api/ejes`). */
export interface Eje {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string | null;
  orden: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Cuerpo de `POST` / `PUT` de un eje. */
export interface EjePayload {
  nombre: string;
  descripcion: string;
  icono?: string | null;
  orden?: number;
}
