import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { API_URL } from '../core/api-url';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';
import { Expositor, ExpositorLogoResponse, ExpositorPayload, ExpositorQuery } from '../models/expositor.model';

export type { Expositor, ExpositorLogoResponse, ExpositorPayload, ExpositorQuery } from '../models/expositor.model';

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

  //***********************LOGO (WebP <=150x150)*************************
  /**
   * Sube el logo de un expositor que ya existe. El backend lo convierte a WebP
   * (máx. 150x150 px, quality 80), lo guarda en `uploads/` y actualiza la
   * columna `logo` del expositor.
   *
   * No se fija `Content-Type`: el navegador debe generar el boundary del
   * `multipart/form-data` (el token lo agrega el `AuthInterceptor`).
   */
  uploadExpositorLogo(id: string, file: File): Observable<ExpositorLogoResponse> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<ExpositorLogoResponse>(`${this.urlBase}${id}/logo`, formData);
  }

  /**
   * Convierte el logo a WebP y devuelve su URL sin asociarlo a ningún expositor.
   * Se usa al dar de alta un expositor nuevo: la URL viaja en el `logo` del
   * `POST /api/expositores`.
   */
  uploadExpositorLogoSinAsignar(file: File): Observable<ExpositorLogoResponse> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<ExpositorLogoResponse>(`${this.urlBase}logo`, formData);
  }
}
