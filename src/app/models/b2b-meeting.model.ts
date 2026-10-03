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

export interface B2BMeetingResponse {
  success: boolean;
  data: { id: number } | null;
  emailEnviado: boolean;
  message: string;
}
