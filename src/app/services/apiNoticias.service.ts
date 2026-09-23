import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ApiNoticiasService {

  urlHost: string = "http://localhost:3000";
  urlBase: string = this.urlHost + "/api/noticias/";
  constructor(private http: HttpClient) { }

  private obtenerToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem('expojuy_admin_token') ||
      sessionStorage.getItem('token')
    );
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

  //***********************OBTENER (listar público)*************************
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

  //***********************OBTENER POR ID*************************
  getNoticiasById(id: number | string): Observable<any> {
    return this.http.get(this.urlBase + id)
  }

  //***********************CREAR (desde CMS)*************************
  postNoticias(actividad: any): Observable<any> {
    return this.http.post(this.urlBase, actividad, this.httpOptionsConAuth())
  }

  //***********************MODIFICAR (desde CMS)*************************
  putModificarNoticias(id: number | string, actividad: any): Observable<any> {
    return this.http.put(this.urlBase + id, actividad, this.httpOptionsConAuth())
  }

  //***********************ELIMINACION FISICA (desde CMS)*************************
  deleteNoticias(id: number | string): Observable<any> {
    return this.http.delete(this.urlBase + id, this.httpOptionsConAuth())
  }
}