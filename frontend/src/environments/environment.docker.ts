/**
 * Configuración para la imagen Docker (`ng build --configuration production,docker`).
 *
 * `apiUrl` es relativa: el frontend lo sirve Nginx, que reenvía `/api` y `/uploads`
 * al contenedor del backend por la red interna (ver `docker/nginx/default.conf.template`).
 * Al ser mismo origen no hay CORS y alcanza con un único hostname público.
 */
export const environment = {
  production: true,

  /** Raíz de la API. Debe incluir el sufijo `/api`. */
  apiUrl: '/api'
};
