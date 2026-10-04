/**
 * Configuración de desarrollo.
 *
 * Este archivo se usa para `ng serve` y `ng build --configuration development`.
 * En Angular, `ng build` sustituye este archivo por `environment.prod.ts`
 * (ver `fileReplacements` en angular.json).
 */
export const environment = {
  production: false,

  /**
   * Raíz de la API. Debe incluir el sufijo `/api`.
   * Los servicios construyen sus endpoints a partir de este valor
   * (por ejemplo: `${environment.apiUrl}/noticias/`).
   */
  apiUrl: 'https://api.expojuy.com.ar/api'
};
