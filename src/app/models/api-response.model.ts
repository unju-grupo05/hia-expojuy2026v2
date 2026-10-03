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
