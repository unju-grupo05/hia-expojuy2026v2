import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ExpositorApi {

  urlHost: string = "http://localhost:3000";
  urlBase: string = this.urlHost + "/api/expositores/";
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
  getExpositores(params?: { page?: number; pageSize?: number; category?: string; search?: string }): Observable<any> {
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };

    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page);
      if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
      if (params.category && params.category !== 'all') httpParams = httpParams.set('category', params.category);
      if (params.search) httpParams = httpParams.set('search', params.search);
    }

    return this.http.get(this.urlBase, { ...httpOptions, params: httpParams })
  }

  //***********************OBTENER POR ID*************************
  getExpositorPorId(id: string): Observable<any> {
    return this.http.get(this.urlBase + id)
  }

  //***********************CREAR*************************
  postExpositor(expositor: any): Observable<any> {
    return this.http.post(this.urlBase, expositor, this.httpOptionsConAuth())
  }

  //***********************MODIFICAR*************************
  putModificarExpositor(id: string, expositor: any): Observable<any> {
    return this.http.put(this.urlBase + id, expositor, this.httpOptionsConAuth())
  }

  //***********************ELIMINACION FISICA*************************
  deleteExpositor(id: string): Observable<any> {
    return this.http.delete(this.urlBase + id, this.httpOptionsConAuth())
  }
}