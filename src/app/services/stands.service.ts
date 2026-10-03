import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { API_URL } from '../core/api-url';
import { ApiResponse } from '../models/api-response.model';
import { StandBackendDto } from '../components/models/stand.model';

@Injectable({
  providedIn: 'root'
})
export class StandsService {
  private readonly urlBase = `${API_URL}/stands`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los stands registrados con soporte de filtros opcionales
   */
  getStands(params?: { sector?: string; estado?: string; search?: string }): Observable<ApiResponse<StandBackendDto[]>> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.sector && params.sector !== 'all') httpParams = httpParams.set('sector', params.sector);
      if (params.estado && params.estado !== 'all') httpParams = httpParams.set('estado', params.estado);
      if (params.search) httpParams = httpParams.set('search', params.search);
    }
    return this.http.get<ApiResponse<StandBackendDto[]>>(this.urlBase, { params: httpParams });
  }

  getStandsDisponibles(expositorId?: string): Observable<ApiResponse<StandBackendDto[]>> {
    let httpParams = new HttpParams();
    if (expositorId) {
      httpParams = httpParams.set('expositorId', expositorId);
    }
    return this.http.get<ApiResponse<StandBackendDto[]>>(`${this.urlBase}/disponibles`, { params: httpParams });
  }
 
  getStandPorId(id: string): Observable<ApiResponse<StandBackendDto>> {
    return this.http.get<ApiResponse<StandBackendDto>>(`${this.urlBase}/${id}`);
  }

  postStand(payload: Partial<StandBackendDto>): Observable<ApiResponse<StandBackendDto>> {
    return this.http.post<ApiResponse<StandBackendDto>>(this.urlBase, payload);
  }

  putStand(id: string, payload: Partial<StandBackendDto>): Observable<ApiResponse<StandBackendDto>> {
    return this.http.put<ApiResponse<StandBackendDto>>(`${this.urlBase}/${id}`, payload);
  }

  deleteStand(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.urlBase}/${id}`);
  }
}
