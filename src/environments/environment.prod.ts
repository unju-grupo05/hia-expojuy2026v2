/**
 * Configuración de producción.
 *
 * Este archivo reemplaza a `environment.ts` durante `ng build --configuration production`
 * (ver `fileReplacements` en angular.json).
 *
 * IMPORTANTE: `apiUrl` usa una ruta relativa, lo que asume que la API se sirve
 * en el MISMO origen que el frontend (por ejemplo, detrás de un proxy inverso
 * con Nginx). Si el backend vive en otro dominio, reemplazar '/api' por la URL
 * completa, por ejemplo 'https://api.expojuy.com.ar/api'.
 */
export const environment = {
  production: true,

  /** Raíz de la API. Debe incluir el sufijo `/api`. */
  apiUrl: '/api'
};
