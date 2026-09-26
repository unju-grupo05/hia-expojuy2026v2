import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { API_URL } from '../core/api-url';
import { ApiResponse } from '../models/api-response.model';
import { NoticiaDTO, NoticiaPayload } from '../models/noticia.model';

@Injectable({
  providedIn: 'root',
})
export class ApiNoticiasService {

  urlBase: string = `${API_URL}/noticias/`;
  constructor(private http: HttpClient) { }

  //***********************OBTENER*************************
  getNoticias(incluirBorradores?: boolean): Observable<ApiResponse<NoticiaDTO[]>> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };

    let httpParams = new HttpParams();
    if (incluirBorradores) {
      httpParams = httpParams.set('incluirBorradores', 'true');
    }

    return this.http.get<ApiResponse<NoticiaDTO[]>>(this.urlBase, { ...httpOptions, params: httpParams });
  }

  getNoticiasById(id: number | string): Observable<ApiResponse<NoticiaDTO>> {
    return this.http.get<ApiResponse<NoticiaDTO>>(this.urlBase + id);
  }

  //***********************CREAR*************************
  postNoticias(noticia: NoticiaPayload): Observable<ApiResponse<NoticiaDTO>> {
    return this.http.post<ApiResponse<NoticiaDTO>>(this.urlBase, noticia);
  }

  //***********************MODIFICAR*************************
  putModificarNoticias(id: number | string, noticia: NoticiaPayload): Observable<ApiResponse<NoticiaDTO>> {
    return this.http.put<ApiResponse<NoticiaDTO>>(this.urlBase + id, noticia);
  }

  //***********************ELIMINACION FISICA*************************
  deleteNoticias(id: number | string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(this.urlBase + id);
  }
}
