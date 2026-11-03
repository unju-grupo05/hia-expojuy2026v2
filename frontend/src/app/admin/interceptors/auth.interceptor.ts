import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

const RUTAS_PUBLICAS_SIN_TOKEN = ['/usuarios/login'];


function normalizarUrl(url: string): string {
  return url.split('?')[0].replace(/\/+$/, '');
}

function esPeticionALaApi(url: string): boolean {
  const normalizada = normalizarUrl(url);
  return (
    normalizada === environment.apiUrl || normalizada.startsWith(`${environment.apiUrl}/`)
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

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
      if (error.status === 401 && debeEnviarToken) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
