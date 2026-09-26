import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

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

  urlBase: string = `${environment.apiUrl}/ejes/`;
  constructor(private http: HttpClient) { }

  //***********************OBTENER*************************
  getEjes(): Observable<any> {
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.get(this.urlBase, httpOptions)
  }

  getEjeById(id: number): Observable<any> {
    return this.http.get(this.urlBase + id)
  }

  //***********************CREAR*************************
  postEje(eje: any): Observable<any> {
    return this.http.post(this.urlBase, eje)
  }

  //***********************MODIFICAR*************************
  putModificarEje(id: number, eje: any): Observable<any> {
    return this.http.put(this.urlBase + id, eje)
  }

  //***********************ELIMINACION FISICA*************************
  deleteEje(id: number): Observable<any> {
    return this.http.delete(this.urlBase + id)
  }
}