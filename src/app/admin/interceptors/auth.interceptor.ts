import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
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
  // Se exige coincidencia exacta o un segmento "/" posterior, para no adjuntar
  // el token a URLs que sólo comparten prefijo (ej. `/api-publico`).
  return (
    normalizada === environment.apiUrl || normalizada.startsWith(`${environment.apiUrl}/`)
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const esLogin = RUTAS_PUBLICAS_SIN_TOKEN.some((ruta) => normalizarUrl(req.url).endsWith(ruta));
  // El token se obtiene del punto único de acceso (`AUTH_TOKEN_KEY` =
  // 'expojuy_admin_token' en localStorage); el interceptor no lee el storage.
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
      // Sólo se cierra la sesión si esta petición LLEVABA el token adjunto.
      // Así un 401 en una consulta pública (sin token) o en el propio login
      // —"credenciales incorrectas", no "sesión expirada"— no expulsa al
      // usuario ni borra una sesión válida.
      if (error.status === 401 && debeEnviarToken) {
        // `logout()` ya limpia el storage y redirige a /admin/login.
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
