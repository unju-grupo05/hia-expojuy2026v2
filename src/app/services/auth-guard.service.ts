import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {

  constructor(private router: Router) { }

  canActivate(): boolean {
    const token = sessionStorage.getItem('token');
    const legajo = sessionStorage.getItem('legajo');
    const nombre = sessionStorage.getItem('nombre');
    const rol = sessionStorage.getItem('rol');

    // Si no existe el token o falta información básica, NO está autenticado
    if (!token || !legajo || !nombre || !rol) {
      console.warn('Acceso denegado: No hay sesión activa.');
      this.router.navigate(['/admin/login']);
      return false;
    }

    // Si llegó hasta acá, está autenticado
    return true;
  }
}
