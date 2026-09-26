import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { clearAuthStorage, readAuthToken } from '../core/auth-storage';

/**
 * Servicio de usuarios.
 *
 * La sesión se gestiona de forma única en `core/auth-storage.ts` (claves
 * `AUTH_TOKEN_KEY` en `localStorage`). Este servicio ya NO lee claves de
 * `sessionStorage`, que pertenecían al sistema de autenticación anterior.
 */
@Injectable({
  providedIn: 'root'
})
export class ApiGestionUsuario {
  hostBase: string;

  constructor(private http: HttpClient) {
    this.hostBase = `${environment.apiUrl}/usuarios/`;
  }

  public login(identificador: string, password: string): Observable<unknown> {
    const httpOption = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    const body = JSON.stringify({ identificador, password });
    return this.http.post(this.hostBase + 'login', body, httpOption);
  }

  /** Cierra la sesión eliminando todos los restos de credenciales. */
  public logout(): void {
    clearAuthStorage();
  }

  public userLoggedIn(): boolean {
    return readAuthToken() !== null;
  }

  public loginVerificacion(correo: string): Observable<unknown> {
    const httpOption = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    const body = JSON.stringify({ correo });
    return this.http.post(this.hostBase + 'login-verificacion', body, httpOption);
  }

  public registrar(usuario: unknown): Observable<unknown> {
    const token = readAuthToken();
    const httpOption = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      })
    };
    return this.http.post(this.hostBase + 'registro', usuario, httpOption);
  }
}
