import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Rutas que nunca deben recibir el token: el propio login no debe disparar
 * el cierre de sesión automático cuando las credenciales son incorrectas.
 */
const RUTAS_PUBLICAS_SIN_TOKEN = ['/usuarios/login'];

/** Normaliza una URL para comparar sin romper con query strings ni barras finales. */
function normalizarUrl(url: string): string {
  return url.split('?')[0].replace(/\/+$/, '');
}

/** Indica si la petición apunta a la API del backend. */
function esPeticionALaApi(url: string): boolean {
  const normalizada = normalizarUrl(url);

  // `environment.apiUrl` puede ser absoluta (dev) o relativa (prod).
  if (environment.apiUrl.startsWith('/')) {
    return normalizada === environment.apiUrl || normalizada.startsWith(`${environment.apiUrl}/`);
  }

  return normalizada.startsWith(environment.apiUrl);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const esLogin = RUTAS_PUBLICAS_SIN_TOKEN.some((ruta) => normalizarUrl(req.url).endsWith(ruta));
  const token = authService.getToken();
  const debeEnviarToken = !!token && esPeticionALaApi(req.url) && !esLogin;

  const authReq = debeEnviarToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Un 401 en el login es "credenciales incorrectas", no "sesión expirada":
      // no se debe cerrar la sesión ni navegar en ese caso.
      if (error.status === 401 && !esLogin) {
        authService.logout();
        router.navigate(['/admin/login']);
      }
      return throwError(() => error);
    })
  );
};
