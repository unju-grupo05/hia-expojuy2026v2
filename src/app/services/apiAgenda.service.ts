import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AgendaApi {

  urlHost: string = "http://localhost:3000";
  urlBase: string = this.urlHost + "/api/agendas/";
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
  getAgenda(): Observable<any> {
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.get(this.urlBase, httpOptions)
  }

  //***********************OBTENER POR ID*************************
  getAgendaById(id: number): Observable<any> {
    return this.http.get(this.urlBase + id)
  }

  //***********************CREAR (desde CMS)*************************
  postAgenda(actividad: any): Observable<any> {
    return this.http.post(this.urlBase, actividad, this.httpOptionsConAuth())
  }

  //***********************MODIFICAR (desde CMS)*************************
  putModificarAgenda(id: number, actividad: any): Observable<any> {
    return this.http.put(this.urlBase + id, actividad, this.httpOptionsConAuth())
  }

  //***********************ELIMINACION FISICA (desde CMS)*************************
  deleteActividad(id: number): Observable<any> {
    return this.http.delete(this.urlBase + id, this.httpOptionsConAuth())
  }

  suscribirse(email: string, actividadId: number): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    return this.http.post(`${this.urlHost}/api/correos`, {
      email,
      actividadId,
      tipo: 'recordatorio'
    }, httpOptions);
  }
}