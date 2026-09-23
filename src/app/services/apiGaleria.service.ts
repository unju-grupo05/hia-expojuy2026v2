import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class GaleriaApi {

  urlHost: string = "http://localhost:3000";
  urlBase: string = this.urlHost + "/api/galerias/";
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

  //***********************OBTENER*************************
  getGaleria(): Observable<any> {
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.get(this.urlBase, httpOptions)
  }

  //***********************OBTENER POR ID*************************
  getGaleriaById(id: number | string): Observable<any> {
    return this.http.get(this.urlBase + id)
  }

  //***********************CREAR*************************
  postGaleria(actividad: any): Observable<any> {
    return this.http.post(this.urlBase, actividad, this.httpOptionsConAuth())
  }

  //***********************MODIFICAR*************************
  putModificarGaleria(id: number | string, actividad: any): Observable<any> {
    return this.http.put(this.urlBase + id, actividad, this.httpOptionsConAuth())
  }

  //***********************ELIMINACION FISICA*************************
  deleteGaleria(id: number | string): Observable<any> {
    return this.http.delete(this.urlBase + id, this.httpOptionsConAuth())
  }
}