import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

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
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

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

    // Mock validation
    const isValid = (emailTrimmed === 'admin@expojuy.com' && password === 'admin123') ||
      (Boolean(emailTrimmed) && Boolean(password) && password.length >= 4);

    if (!isValid) {
      this.isLoading.set(false);
      return throwError(() => new Error('Credenciales inválidas. Usa admin@expojuy.com / admin123 para el acceso de prueba.'));
    }

    const mockResponse: AuthResponse = {
      token: 'jwt-expojuy-admin-' + Math.random().toString(36).substring(2) + '-' + Date.now(),
      user: {
        id: 'admin-01',
        email: emailTrimmed,
        name: 'Administrador ExpoJuy',
        role: 'Super Admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      }
    };

    return of(mockResponse).pipe(
      delay(600),
      tap({
        next: (res) => {
          if (this.isBrowser) {
            localStorage.setItem(TOKEN_KEY, res.token);
            localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          }
          this.isAuthenticated.set(true);
          this.currentUser.set(res.user);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
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
