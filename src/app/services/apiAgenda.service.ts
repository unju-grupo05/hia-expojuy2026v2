import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AgendaApi {

  urlBase: string = `${environment.apiUrl}/agendas/`;
  constructor(private http: HttpClient) { }

  //***********************OBTENER*************************
  getAgenda(): Observable<any> {
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.get(this.urlBase, httpOptions)
  }

  getAgendaById(id: number): Observable<any> {
    return this.http.get(this.urlBase + id)
  }

  //***********************CREAR*************************
  postAgenda(actividad: any): Observable<any> {
    return this.http.post(this.urlBase, actividad)
  }

  //***********************MODIFICAR*************************
  putModificarAgenda(id: number, actividad: any): Observable<any> {
    return this.http.put(this.urlBase + id, actividad)
  }

  //***********************ELIMINACION FISICA*************************
  deleteActividad(id: number): Observable<any> {
    return this.http.delete(this.urlBase + id)
  }

  suscribirse(email: string, actividadId: number): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    return this.http.post(`${environment.apiUrl}/correos`, {
      email,
      actividadId,
      tipo: 'recordatorio'
    }, httpOptions);
  }
}