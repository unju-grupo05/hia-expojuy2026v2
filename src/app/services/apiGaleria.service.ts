import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GaleriaApi {

  urlBase: string = `${environment.apiUrl}/galerias/`;
  constructor(private http: HttpClient) { }

  //***********************OBTENER*************************
  getGaleria(): Observable<any> {
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.get(this.urlBase, httpOptions)
  }

  getGaleriaById(id: number | string): Observable<any> {
    return this.http.get(this.urlBase + id)
  }

  //***********************CREAR*************************
  postGaleria(actividad: any): Observable<any> {
    return this.http.post(this.urlBase, actividad)
  }

  //***********************MODIFICAR*************************
  putModificarGaleria(id: number | string, actividad: any): Observable<any> {
    return this.http.put(this.urlBase + id, actividad)
  }

  //***********************ELIMINACION FISICA*************************
  deleteGaleria(id: number | string): Observable<any> {
    return this.http.delete(this.urlBase + id)
  }
}