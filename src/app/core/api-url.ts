import { environment } from '../../environments/environment';

/** Raíz de la API, tal como está definida en el archivo de environment activo. */
export const API_URL = environment.apiUrl;

const SUFIJO_API = '/api';

/**
 * Origen (sin el sufijo `/api`) usado para construir URLs absolutas de archivos
 * subidos, que el backend sirve desde la raíz (por ejemplo `/uploads/logo.png`).
 *
 * - dev  → `http://localhost:3000/api`  ⇒ `http://localhost:3000`
 * - prod → `/api`                        ⇒ `''` (mismo origen del frontend)
 */
export const ASSETS_BASE = API_URL.endsWith(SUFIJO_API)
  ? API_URL.slice(0, -SUFIJO_API.length)
  : API_URL;
