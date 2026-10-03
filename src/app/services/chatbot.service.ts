import { Injectable } from '@angular/core';
import { Observable, Subject, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../core/api-url';
import { ApiResponse } from '../models/api-response.model';
import { ChatQueryData, ChatResult, ChatSuggestion } from '../models/chatbot.model';

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  private readonly urlBase = `${API_URL}/chatbot`;

  /** Flujo de texto sobre el que se aplica el debounce de 300 ms. */
  private readonly consultas$ = new Subject<string>();

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