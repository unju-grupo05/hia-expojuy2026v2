/**
 * Configuración de producción.
 *
 * Este archivo reemplaza a `environment.ts` durante `ng build --configuration production`
 * (ver `fileReplacements` en angular.json).
 *
 * IMPORTANTE: `apiUrl` es una URL ABSOLUTA a propósito. Con una ruta relativa
 * ('/api') el navegador resuelve contra el origen desde el que se sirvió el
 * frontend; si eso es `http://localhost:4200` (el servidor de `ng serve`), la
 * petición pega al fallback SPA de Angular, que devuelve `index.html` en lugar
 * de JSON y rompe el parseo de la respuesta.
 *
 * OJO — al ser origen distinto, cada llamada pasa por CORS. El backend debe
 * permitir el origen del frontend (ver `cors()` en expojuy2026v2-Back/index.js).
 */
export const environment = {
  production: true,

  /** Raíz de la API. Debe incluir el sufijo `/api`. */
  apiUrl: 'https://api.expojuy.com.ar/api'
};
