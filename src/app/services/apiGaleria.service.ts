import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_URL } from '../core/api-url';
import { ApiResponse } from '../models/api-response.model';
import { GaleriaItem, GaleriaPayload } from '../models/galeria.model';

export type { GaleriaItem, GaleriaPayload } from '../models/galeria.model';

@Injectable({
  providedIn: 'root',
})
export class GaleriaApi {

  urlBase: string = `${API_URL}/galerias/`;
  constructor(private http: HttpClient) { }

  //***********************OBTENER*************************
  getGaleria(): Observable<ApiResponse<GaleriaItem[]>> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.get<ApiResponse<GaleriaItem[]>>(this.urlBase, httpOptions);
  }

  getGaleriaById(id: number | string): Observable<ApiResponse<GaleriaItem>> {
    return this.http.get<ApiResponse<GaleriaItem>>(this.urlBase + id);
  }

  //***********************CREAR*************************
  postGaleria(item: GaleriaPayload): Observable<ApiResponse<GaleriaItem>> {
    return this.http.post<ApiResponse<GaleriaItem>>(this.urlBase, item);
  }

  //***********************MODIFICAR*************************
  putModificarGaleria(id: number | string, item: GaleriaPayload): Observable<ApiResponse<GaleriaItem>> {
    return this.http.put<ApiResponse<GaleriaItem>>(this.urlBase + id, item);
  }

  //***********************ELIMINACION FISICA*************************
  deleteGaleria(id: number | string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(this.urlBase + id);
  }
}
