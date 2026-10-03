/** Quién escribió el mensaje en el hilo. */
export type ChatSender = 'user' | 'bot';

/** Mensaje del hilo. `results` solo se llena en respuestas del bot. */
export interface ChatMessage {
  sender: ChatSender;
  text: string;
  results?: ChatResult[];
}

/** Coincidencia devuelta por PostgreSQL, ya recortada por el backend. */
export interface ChatResult {
  /** Tabla de origen: `noticia`, `agenda`, `eje`, `expositor` o `galeria`. */
  origen: string;
  /** Etiqueta legible para la tarjeta: "Novedad", "Agenda", "Expositor"… */
  etiqueta: string;
  /** Ancla interna del sitio a la que apunta la tarjeta. */
  enlace: string;
  titulo: string;
  descripcion: string;
  /** Dato secundario variable según la tabla (categoría, lugar, stand…). */
  metadato: string | null;
  /** Fecha u horario, cuando la tabla lo tiene. */
  fecha: string | null;
}

/** `data` de `POST /api/chatbot/query`. */
export interface ChatQueryData {
  mensaje: string;
  resultados: ChatResult[];
  terminos: string[];
}

/** `data` de `GET /api/chatbot/sugerencias`. */
export interface ChatSuggestion {
  texto: string;
  consulta: string;
}