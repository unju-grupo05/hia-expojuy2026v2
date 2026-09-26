/**
 * Envelope comun de la API.
 *
 * Todos los controllers responden con la misma forma:
 * `{ success, data, message }`, donde `data` es `null` en los errores y en los
 * borrados. Antes cada servicio devolvia `Observable<any>` y cada componente
 * hacia su propio `res?.data` defensivo; con estos tipos la forma queda
 * declarada en un unico lugar.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
}

/** Payload de las respuestas paginadas (`data` de `/expositores`). */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  page: number;
}

/** Respuesta paginada completa. */
export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;
