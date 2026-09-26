/** Solicitud de reunion B2B (`POST /api/reuniones-b2b`). */
export interface B2BMeetingRequest {
  nombreCliente: string;
  empresaCliente: string;
  emailCliente: string;
  telefonoCliente: string;
  expositorId: string;
  empresaExpositora: string;
  fechaSolicitada: string;
  horaInicioSolicitada: string;
  horaFinSolicitada: string;
  cantidadAsistentes: number;
  motivo: string;
  modalidad: 'presencial' | 'virtual';
  observaciones: string;
}

/**
 * Respuesta del alta. El controller distingue dos casos con el mismo `201`:
 * - `emailEnviado: true`  -> se notifico al expositor.
 * - `emailEnviado: false` -> la solicitud quedo guardada, pero el aviso fallo
 *   y `message` trae el motivo.
 */
export interface B2BMeetingResponse {
  success: boolean;
  data: { id: number } | null;
  emailEnviado: boolean;
  message: string;
}
