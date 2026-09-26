import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_URL } from '../core/api-url';
import { ApiResponse } from '../models/api-response.model';
import { Eje, EjePayload } from '../models/eje.model';

export type { Eje, EjePayload } from '../models/eje.model';

@Injectable({
  providedIn: 'root',
})
export class EjesService {

  urlBase: string = `${API_URL}/ejes/`;
  constructor(private http: HttpClient) { }

  //***********************OBTENER*************************
  getEjes(): Observable<ApiResponse<Eje[]>> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.get<ApiResponse<Eje[]>>(this.urlBase, httpOptions);
  }

  getEjeById(id: number): Observable<ApiResponse<Eje>> {
    return this.http.get<ApiResponse<Eje>>(this.urlBase + id);
  }

  //***********************CREAR*************************
  postEje(eje: EjePayload): Observable<ApiResponse<Eje>> {
    return this.http.post<ApiResponse<Eje>>(this.urlBase, eje);
  }

  //***********************MODIFICAR*************************
  putModificarEje(id: number, eje: EjePayload): Observable<ApiResponse<Eje>> {
    return this.http.put<ApiResponse<Eje>>(this.urlBase + id, eje);
  }

  //***********************ELIMINACION FISICA*************************
  deleteEje(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(this.urlBase + id);
  }
}
