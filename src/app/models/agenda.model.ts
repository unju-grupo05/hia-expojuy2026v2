export interface AgendaEvento {
  id: number;
  dia: number;
  diaSemana: string | null;
  horaInicio: string;
  horaFin: string;
  titulo: string;
  descripcion: string | null;
  lugar: string | null;
  disertante: string | null;
  etiqueta: string | null;
  orden: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Cuerpo de `POST` / `PUT` de una actividad. */
export interface AgendaPayload {
  dia: number;
  diaSemana?: string | null;
  horaInicio: string;
  horaFin: string;
  titulo: string;
  descripcion?: string | null;
  lugar?: string | null;
  disertante?: string | null;
  etiqueta?: string | null;
  orden?: number;
}

/** Cuerpo del registro de recordatorio (`POST /api/correos`). */
export interface RecordatorioPayload {
  email: string;
  actividadId: number;
  tipo: 'recordatorio';
}

/** Suscripcion persistida por el backend tras registrar un recordatorio. */
export interface RecordatorioSuscripcion {
  id: number;
  email: string;
  actividadId: number;
  createdAt?: string;
  updatedAt?: string;
}
