import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AuthCredentials,
  AuthLoginResponse,
  AuthUsuarioClaims
} from '../../models/auth.model';
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
  /** URL de avatar provista por el backend. */
  avatar?: string;
}

export type LoginCredentials = AuthCredentials;

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

    if (!token || isTokenExpired(token)) {
      clearAuthStorage();
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
      return;
    }

    this.isAuthenticated.set(true);
    this.currentUser.set(
      readAuthUser<AdminUser>() ?? {
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

    const body = {
      identificador: emailTrimmed,
      password
    };

    return this.http.post<AuthLoginResponse>(this.loginUrl, body, httpOptions).pipe(
      map((res) => {
        if (!res?.token) {
          throw new Error('Respuesta inválida del servidor.');
        }

        const claims: AuthUsuarioClaims = res.usuario;

        const usuario: AdminUser = {
          id: claims?.legajo || 'admin-01',
          email: emailTrimmed || '',
          name: [claims?.nombre, claims?.apellido].filter(Boolean).join(' ') || 'Administrador ExpoJuy',
          role: claims?.rol || 'admin',
          avatar: claims?.avatar ?? undefined
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