import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { API_URL } from '../core/api-url';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';
import { Expositor, ExpositorPayload, ExpositorQuery } from '../models/expositor.model';

export type { Expositor, ExpositorPayload, ExpositorQuery } from '../models/expositor.model';

@Injectable({
  providedIn: 'root',
})
export class ExpositoresService {

  urlBase: string = `${API_URL}/expositores/`;
  constructor(private http: HttpClient) { }

  //***********************OBTENER*************************
  getExpositores(params?: ExpositorQuery): Observable<PaginatedResponse<Expositor>> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };

    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page);
      if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
      if (params.category && params.category !== 'all') httpParams = httpParams.set('category', params.category);
      if (params.search) httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<PaginatedResponse<Expositor>>(this.urlBase, { ...httpOptions, params: httpParams });
  }

  getExpositorPorId(id: string): Observable<ApiResponse<Expositor>> {
    return this.http.get<ApiResponse<Expositor>>(this.urlBase + id);
  }

  //***********************CREAR*************************
  postExpositor(expositor: ExpositorPayload): Observable<ApiResponse<Expositor>> {
    return this.http.post<ApiResponse<Expositor>>(this.urlBase, expositor);
  }

  //***********************MODIFICAR*************************
  putModificarExpositor(id: string, expositor: ExpositorPayload): Observable<ApiResponse<Expositor>> {
    return this.http.put<ApiResponse<Expositor>>(this.urlBase + id, expositor);
  }

  //***********************ELIMINACION FISICA*************************
  deleteExpositor(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(this.urlBase + id);
  }
}
