import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protege el panel de administración.
 *
 * Exige una sesión vigente: no basta con que exista un token en `localStorage`,
 * también se valida que no haya expirado (`AuthService.hasValidSession`).
 * Si no la hay, redirige a `/admin/login` conservando la URL solicitada.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasValidSession()) {
    return true;
  }

  return router.createUrlTree(['/admin/login'], {
    queryParams: { returnUrl: state.url }
  });
};
