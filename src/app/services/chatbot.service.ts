import { Injectable } from '@angular/core';
import { Observable, Subject, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../core/api-url';
import { ApiResponse } from '../models/api-response.model';
import { ChatQueryData, ChatResult, ChatSuggestion } from '../models/chatbot.model';

/**
 * Cliente HTTP del asistente virtual "PachAI".
 *
 * No mantiene estado del hilo: eso es responsabilidad del componente. Acá solo
 * se traduce el texto del usuario a la consulta contra el backend y se aplica
 * el `debounce` que evita enviar una petición por tecla.
 */
@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  private readonly urlBase = `${API_URL}/chatbot`;

  /** Flujo de texto sobre el que se aplica el debounce de 300 ms. */
  private readonly consultas$ = new Subject<string>();

  /**
   * Consulta diferida: cada emisión que llega dentro de los 300 ms siguientes
   * cancela la anterior, y `switchMap` descarta la respuesta HTTP que ya no
   * interesa. Así nunca se acumulan peticiones por tecleo.
   */
  readonly consultaDiferida$: Observable<ChatQueryData> = this.consultas$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(texto => this.consultar(texto))
  );

  constructor(private http: HttpClient) {}

  /** Alimenta el flujo diferido con una consulta del usuario. */
  enviarConsulta(texto: string): void {
    this.consultas$.next(texto);
  }

  /**
   * Paso 1 del flujo: `POST /api/chatbot/query`.
   * El backend sanitiza, extrae palabras clave y consulta PostgreSQL.
   */
  consultar(texto: string): Observable<ChatQueryData> {
    return this.http
      .post<ApiResponse<ChatQueryData>>(this.urlBase + '/query', { query: texto })
      .pipe(map(respuesta => respuesta.data ?? { mensaje: '', resultados: [], terminos: [] }));
  }

  /** Variante por keyword (`GET /api/chatbot/search`). */
  buscar(termino: string): Observable<ChatResult[]> {
    return this.http
      .get<ApiResponse<ChatResult[]>>(this.urlBase + '/search', { params: { q: termino } })
      .pipe(map(respuesta => respuesta.data ?? []));
  }

  /**
   * Preguntas frecuentes (`GET /api/chatbot/sugerencias`).
   *
   * Si el backend devuelve una lista vacía se usan las sugerencias locales, de
   * modo que el chat sigue siendo usable aunque el endpoint no esté montado.
   */
  obtenerSugerencias(): Observable<ChatSuggestion[]> {
    return this.http.get<ApiResponse<ChatSuggestion[]>>(this.urlBase + '/sugerencias').pipe(
      map(respuesta => {
        const sugerencias = respuesta.data ?? [];
        return sugerencias.length > 0 ? sugerencias : SUGERENCIAS_LOCALES;
      })
    );
  }
}

/** Respaldo usado si `/sugerencias` no está disponible. */
const SUGERENCIAS_LOCALES: ChatSuggestion[] = [
  { texto: '¿Quiénes hicieron esta página?', consulta: 'quienes hicieron' },
  { texto: '¿Qué hay en la agenda?', consulta: 'agenda actividades' },
  { texto: '¿Quiénes son los expositores?', consulta: 'expositores empresas' },
  { texto: '¿De qué trata ExpoJuy?', consulta: 'que es expojuy' },
  { texto: 'Ver últimas noticias', consulta: 'noticias novedades' },
  { texto: 'Minería y litio', consulta: 'litio mineria' },
  { texto: 'Fotografías de la feria', consulta: 'galeria fotos' },
  { texto: '¿Quiénes son los sponsors?', consulta: 'sponsors' },
  { texto: '¿Dónde queda el predio?', consulta: 'ubicacion predio mapa' }
];