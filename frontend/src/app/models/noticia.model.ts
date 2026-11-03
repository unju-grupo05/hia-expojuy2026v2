export interface NoticiaDTO {
  id: number;
  slug: string;
  titulo: string;
  categoria: string;
  descripcion: string;
  /** Nombre del archivo en el servidor; la URL absoluta la arma `MediaService`. */
  imagen: string | null;
  /** `DATEONLY` de Sequelize: siempre `YYYY-MM-DD`. */
  fecha: string;
  linkExterno: string | null;
  vigente: boolean;
  isLarge?: boolean;
  displaySize?: 'large' | 'small';
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo de `POST` / `PUT`. `id` y timestamps los asigna el servidor. */
export interface NoticiaPayload {
  slug: string;
  titulo: string;
  categoria: string;
  descripcion: string;
  imagen?: string | null;
  fecha: string;
  linkExterno?: string | null;
  vigente?: boolean;
  isLarge?: boolean;
  displaySize?: 'large' | 'small';
}
