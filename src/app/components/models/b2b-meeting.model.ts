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
