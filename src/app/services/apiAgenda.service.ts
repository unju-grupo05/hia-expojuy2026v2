import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_URL } from '../core/api-url';
import { ApiResponse } from '../models/api-response.model';
import {
  AgendaEvento,
  AgendaPayload,
  RecordatorioPayload,
  RecordatorioSuscripcion
} from '../models/agenda.model';

@Injectable({
  providedIn: 'root',
})
export class AgendaApi {

  urlBase: string = `${API_URL}/agendas/`;
  constructor(private http: HttpClient) { }

  //***********************OBTENER*************************
  getAgenda(): Observable<ApiResponse<AgendaEvento[]>> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.get<ApiResponse<AgendaEvento[]>>(this.urlBase, httpOptions);
  }

  getAgendaById(id: number): Observable<ApiResponse<AgendaEvento>> {
    return this.http.get<ApiResponse<AgendaEvento>>(this.urlBase + id);
  }

  //***********************CREAR*************************
  postAgenda(actividad: AgendaPayload): Observable<ApiResponse<AgendaEvento>> {
    return this.http.post<ApiResponse<AgendaEvento>>(this.urlBase, actividad);
  }

  //***********************MODIFICAR*************************
  putModificarAgenda(id: number, actividad: AgendaPayload): Observable<ApiResponse<AgendaEvento>> {
    return this.http.put<ApiResponse<AgendaEvento>>(this.urlBase + id, actividad);
  }

  //***********************ELIMINACION FISICA*************************
  deleteActividad(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(this.urlBase + id);
  }

  suscribirse(email: string, actividadId: number): Observable<ApiResponse<RecordatorioSuscripcion>> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    const payload: RecordatorioPayload = {
      email,
      actividadId,
      tipo: 'recordatorio'
    };

    return this.http.post<ApiResponse<RecordatorioSuscripcion>>(`${API_URL}/correos`, payload, httpOptions);
  }
}
