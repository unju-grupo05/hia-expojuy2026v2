import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
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

const TOKEN_KEY = 'expojuy_admin_token';
const USER_KEY = 'expojuy_admin_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private urlHost = 'http://localhost:3000';
  private loginUrl = this.urlHost + '/api/usuarios/login';

  public readonly isAuthenticated = signal<boolean>(false);
  public readonly currentUser = signal<AdminUser | null>(null);
  public readonly isLoading = signal<boolean>(false);

  constructor() {
    this.checkInitialAuthState();
  }

  private checkInitialAuthState(): void {
    if (!this.isBrowser) return;

    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (token) {
        this.isAuthenticated.set(true);
        if (savedUser) {
          this.currentUser.set(JSON.parse(savedUser));
        } else {
          this.currentUser.set({
            id: 'admin-01',
            email: 'admin@expojuy.com',
            name: 'Administrador ExpoJuy',
            role: 'Super Admin',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          });
        }
      }
    } catch {
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
    }
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
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        };

        if (this.isBrowser) {
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USER_KEY, JSON.stringify(usuario));
        }

        this.isAuthenticated.set(true);
        this.currentUser.set(usuario);
        this.isLoading.set(false);

        return { token: res.token, user: usuario };
      }),
      catchError((httpError: HttpErrorResponse) => {
        this.isLoading.set(false);

        let message = 'No se pudo conectar con el servidor. Verifica que el Backend esté activo en el puerto 3000.';
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
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/admin/login']);
  }

  public getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(TOKEN_KEY);
  }
}