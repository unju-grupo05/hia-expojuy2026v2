import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  clearAuthStorage,
  isTokenExpired,
  readAuthToken,
  readAuthUser,
  writeAuthStorage
} from '../../core/auth-storage';

export { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../../core/auth-storage';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  /** URL de avatar provista por el backend. Opcional: la UI debe mostrar un fallback local. */
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AdminUser;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private loginUrl = `${environment.apiUrl}/usuarios/login`;

  public readonly isAuthenticated = signal<boolean>(false);
  public readonly currentUser = signal<AdminUser | null>(null);
  public readonly isLoading = signal<boolean>(false);

  constructor() {
    this.checkInitialAuthState();
  }

  private checkInitialAuthState(): void {
    if (!this.isBrowser) return;

    const token = readAuthToken();

    // Un token vencido o ilegible no habilita sesión: se limpian los restos
    // para no mostrar un panel "autenticado" cuya primera petición saldrá con 401.
    if (!token || isTokenExpired(token)) {
      clearAuthStorage();
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
      return;
    }

    this.isAuthenticated.set(true);
    this.currentUser.set(
      readAuthUser<AdminUser>() ?? {
        // Sin datos de perfil persistidos: se construye un usuario mínimo
        // SIN imagen externa. El avatar real debe provenir del backend.
        id: 'admin-01',
        email: '',
        name: 'Administrador ExpoJuy',
        role: 'admin'
      }
    );
  }

  public login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.isLoading.set(true);

    const emailTrimmed = credentials.email?.trim().toLowerCase();
    const password = credentials.password?.trim();

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    // El Backend espera `identificador` (correo o legajo) y `password`
    const body = {
      identificador: emailTrimmed,
      password
    };

    return this.http.post<{ msg: string; token: string; usuario: any }>(this.loginUrl, body, httpOptions).pipe(
      map((res) => {
        if (!res?.token) {
          throw new Error('Respuesta inválida del servidor.');
        }

        const usuario: AdminUser = {
          id: res.usuario?.legajo || 'admin-01',
          email: emailTrimmed || '',
          name: [res.usuario?.nombre, res.usuario?.apellido].filter(Boolean).join(' ') || 'Administrador ExpoJuy',
          role: res.usuario?.rol || 'admin',
          // Sin avatar por defecto: sólo se usa si el backend lo envía.
          avatar: res.usuario?.avatar ?? undefined
        };

        writeAuthStorage(res.token, usuario);

        this.isAuthenticated.set(true);
        this.currentUser.set(usuario);
        this.isLoading.set(false);

        return { token: res.token, user: usuario };
      }),
      catchError((httpError: HttpErrorResponse) => {
        this.isLoading.set(false);

        let message = 'No se pudo conectar con el servidor. Verificá que la API esté disponible.';
        if (httpError.status === 401) {
          message = httpError.error?.msg || 'Contraseña incorrecta.';
        } else if (httpError.status === 404) {
          message = httpError.error?.msg || 'Usuario no encontrado.';
        } else if (httpError.status === 400) {
          message = httpError.error?.msg || 'Ingresa tu correo y contraseña.';
        }

        return throwError(() => new Error(message));
      })
    );
  }

  public logout(): void {
    clearAuthStorage();
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/admin/login']);
  }

  public getToken(): string | null {
    if (!this.isBrowser) return null;
    return readAuthToken();
  }

  /**
   * Indica si hay una sesión vigente: el token existe y su claim `exp` no venció.
   * Si está vencido, limpia los restos de sesión para no dejar credenciales muertas.
   * Es la comprobación que deben usar los guards de ruta.
   */
  public hasValidSession(): boolean {
    if (!this.isBrowser) return false;

    const token = readAuthToken();
    if (!token) {
      return false;
    }

    if (isTokenExpired(token)) {
      clearAuthStorage();
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
      return false;
    }

    return true;
  }
}