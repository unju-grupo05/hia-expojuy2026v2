/**
 * Contrato de `Noticia` (`/api/noticias`).
 *
 * Refleja el modelo Sequelize `noticias`. Ojo: los campos van en espanol y los
 * nombres NO son `resumen` / `cuerpo` / `imagenUrl`; son `descripcion`,
 * `imagen` y `fecha`. Este tipo es la unica fuente de verdad del contrato: los
 * componentes que necesitaban otra forma (admin en ingles, grilla publica con
 * parrafos pre-partidos) siguen teniendo sus view models, derivados de aqui.
 */
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
}
