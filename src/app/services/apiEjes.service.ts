import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface Eje {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string | null;
  orden: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiEjes {

  urlHost: string = "http://localhost:3000";
  urlBase: string = this.urlHost + "/api/ejes/";
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
  getEjes(): Observable<any> {
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.get(this.urlBase, httpOptions)
  }

  //***********************OBTENER POR ID*************************
  getEjeById(id: number): Observable<any> {
    return this.http.get(this.urlBase + id)
  }

  //***********************CREAR (desde CMS)*************************
  postEje(eje: any): Observable<any> {
    return this.http.post(this.urlBase, eje, this.httpOptionsConAuth())
  }

  //***********************MODIFICAR (desde CMS)*************************
  putModificarEje(id: number, eje: any): Observable<any> {
    return this.http.put(this.urlBase + id, eje, this.httpOptionsConAuth())
  }

  //***********************ELIMINACION FISICA (desde CMS)*************************
  deleteEje(id: number): Observable<any> {
    return this.http.delete(this.urlBase + id, this.httpOptionsConAuth())
  }
}