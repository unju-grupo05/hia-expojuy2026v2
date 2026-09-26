import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { readAuthToken } from '../core/auth-storage';

@Injectable({
  providedIn: 'root',
})
export class ApiNoticiasService {

  urlBase: string = `${environment.apiUrl}/noticias/`;
  constructor(private http: HttpClient) { }

  private obtenerToken(): string | null {
    return readAuthToken();
  }

  private httpOptionsConAuth() {
    const token = this.obtenerToken();
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      })
    };
  }

  //***********************OBTENER*************************
  getNoticias(incluirBorradores?: boolean): Observable<any> {
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };

    let httpParams = new HttpParams();
    if (incluirBorradores) {
      httpParams = httpParams.set('incluirBorradores', 'true');
    }

    return this.http.get(this.urlBase, { ...httpOptions, params: httpParams })
  }

  getNoticiasById(id: number | string): Observable<any> {
    return this.http.get(this.urlBase + id)
  }

  //***********************CREAR*************************
  postNoticias(actividad: any): Observable<any> {
    return this.http.post(this.urlBase, actividad, this.httpOptionsConAuth())
  }

  //***********************MODIFICAR*************************
  putModificarNoticias(id: number | string, actividad: any): Observable<any> {
    return this.http.put(this.urlBase + id, actividad, this.httpOptionsConAuth())
  }

  //***********************ELIMINACION FISICA*************************
  deleteNoticias(id: number | string): Observable<any> {
    return this.http.delete(this.urlBase + id, this.httpOptionsConAuth())
  }
}